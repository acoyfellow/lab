#!/usr/bin/env bun
/**
 * One-off operational migration for the breaking trace -> result rename.
 *
 * What it does:
 * - KV: copies `trace:${id}` -> `result:${id}` and rewrites saved-result payload field `trace` -> `steps`
 * - Versus DO: renames `games.trace_ids` -> `games.result_ids`
 *
 * Required env for KV:
 * - CLOUDFLARE_API_TOKEN
 * - CLOUDFLARE_ACCOUNT_ID
 * - LAB_KV_NAMESPACE_ID
 *
 * Required env for DO migration unless --skip-do:
 * - LAB_WORKER_URL
 *   This must be a Worker origin that exposes POST /invoke/do, for example:
 *   - local dev worker: http://localhost:1337
 *   - a temporary maintenance Worker URL
 *
 * Optional:
 * - VERSUS_DO_NAME   default: versus
 * - DELETE_OLD=1     delete old `trace:` KV keys after successful copy
 *
 * Flags:
 * - --skip-kv
 * - --skip-do
 * - --delete-old
 */

type KvListResponse = {
	success?: boolean;
	result?: Array<{ name?: string }>;
	result_info?: {
		cursor?: string;
		cursors?: { after?: string };
	};
	errors?: Array<{ message?: string }>;
};

type InvokeDoEnvelope = {
	ok?: boolean;
	result?: { ok?: boolean; rows?: Record<string, unknown>[]; error?: string };
	error?: string;
};

const args = new Set(process.argv.slice(2));
const skipKv = args.has('--skip-kv');
const skipDo = args.has('--skip-do');
const deleteOld = args.has('--delete-old') || process.env.DELETE_OLD === '1';

const cfApiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';
const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
const kvNamespaceId = process.env.LAB_KV_NAMESPACE_ID?.trim() ?? '';
const workerUrl = process.env.LAB_WORKER_URL?.trim().replace(/\/+$/, '') ?? '';
const versusDoName = process.env.VERSUS_DO_NAME?.trim() || 'versus';

function requireEnv(name: string, value: string): string {
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

async function cfFetch(path: string, init?: RequestInit): Promise<Response> {
	const token = requireEnv('CLOUDFLARE_API_TOKEN', cfApiToken);
	const headers = new Headers(init?.headers);
	headers.set('Authorization', `Bearer ${token}`);
	const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		...init,
		headers,
	});

	if (!response.ok) {
		throw new Error(`Cloudflare API ${response.status} for ${path}: ${await response.text()}`);
	}

	return response;
}

function kvBasePath(): string {
	return `/accounts/${requireEnv('CLOUDFLARE_ACCOUNT_ID', cfAccountId)}/storage/kv/namespaces/${requireEnv('LAB_KV_NAMESPACE_ID', kvNamespaceId)}`;
}

function nextCursor(info: KvListResponse['result_info']): string | undefined {
	if (!info) return undefined;
	if (typeof info.cursor === 'string' && info.cursor) return info.cursor;
	if (typeof info.cursors?.after === 'string' && info.cursors.after) return info.cursors.after;
	return undefined;
}

async function listKvKeys(prefix: string): Promise<string[]> {
	const keys: string[] = [];
	let cursor: string | undefined;

	do {
		const search = new URLSearchParams({ prefix, limit: '1000' });
		if (cursor) search.set('cursor', cursor);
		const response = await cfFetch(`${kvBasePath()}/keys?${search.toString()}`);
		const json = (await response.json()) as KvListResponse;
		if (json.success === false) {
			throw new Error(`Failed to list KV keys: ${json.errors?.map((e) => e.message).filter(Boolean).join(', ') || 'unknown error'}`);
		}
		for (const entry of json.result ?? []) {
			if (typeof entry.name === 'string' && entry.name) keys.push(entry.name);
		}
		cursor = nextCursor(json.result_info);
	} while (cursor);

	return keys;
}

async function getKvValue(key: string): Promise<string> {
	const response = await cfFetch(`${kvBasePath()}/values/${encodeURIComponent(key)}`);
	return response.text();
}

async function putKvValue(key: string, value: string): Promise<void> {
	await cfFetch(`${kvBasePath()}/values/${encodeURIComponent(key)}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: value,
	});
}

async function deleteKvValue(key: string): Promise<void> {
	await cfFetch(`${kvBasePath()}/values/${encodeURIComponent(key)}`, {
		method: 'DELETE',
	});
}

async function migrateKvSavedResults(): Promise<void> {
	const keys = await listKvKeys('trace:');
	console.log(`KV: found ${keys.length} trace:* keys`);

	let rewrittenPayloads = 0;
	let deleted = 0;

	for (const key of keys) {
		const resultKey = key.replace(/^trace:/, 'result:');
		const raw = await getKvValue(key);

		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(raw) as Record<string, unknown>;
		} catch (error) {
			throw new Error(`KV key ${key} does not contain JSON: ${error instanceof Error ? error.message : String(error)}`);
		}

		if ('trace' in parsed && !('steps' in parsed)) {
			parsed.steps = parsed.trace;
			delete parsed.trace;
			rewrittenPayloads++;
		}

		await putKvValue(resultKey, JSON.stringify(parsed));

		if (deleteOld) {
			await deleteKvValue(key);
			deleted++;
		}
	}

	console.log(
		`KV: wrote ${keys.length} result:* keys, rewrote ${rewrittenPayloads} payloads from trace -> steps${deleteOld ? `, deleted ${deleted} old trace:* keys` : ''}`,
	);
}

async function invokeDo(path: string, body: unknown): Promise<Record<string, unknown>> {
	const base = requireEnv('LAB_WORKER_URL', workerUrl);
	const response = await fetch(`${base}/invoke/do`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: versusDoName,
			method: 'POST',
			path,
			body,
		}),
	});

	const json = (await response.json()) as InvokeDoEnvelope;
	if (!response.ok || !json.ok || !json.result) {
		throw new Error(`DO invoke failed: ${json.error ?? `status ${response.status}`}`);
	}

	return json.result;
}

async function doQuery(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
	const result = await invokeDo('/sql/query', { sql, params });
	if (result.ok === false) {
		throw new Error(`DO query failed: ${String(result.error ?? 'unknown error')}`);
	}
	return Array.isArray(result.rows) ? result.rows : [];
}

async function doExec(sql: string, params?: unknown[]): Promise<void> {
	const result = await invokeDo('/sql/exec', { sql, params });
	if (result.ok === false) {
		throw new Error(`DO exec failed: ${String(result.error ?? 'unknown error')}`);
	}
}

async function migrateVersusGamesTable(): Promise<void> {
	const columns = await doQuery('PRAGMA table_info(games)');
	if (columns.length === 0) {
		console.log('DO: games table not found; skipping versus migration');
		return;
	}

	const names = new Set(columns.map((row) => String(row.name ?? '')));
	if (names.has('result_ids')) {
		console.log('DO: games.result_ids already present; skipping versus migration');
		return;
	}
	if (!names.has('trace_ids')) {
		throw new Error('DO: games table has neither trace_ids nor result_ids');
	}

	await doExec('ALTER TABLE games RENAME COLUMN trace_ids TO result_ids');
	const afterColumns = await doQuery('PRAGMA table_info(games)');
	const afterNames = new Set(afterColumns.map((row) => String(row.name ?? '')));
	if (!afterNames.has('result_ids')) {
		throw new Error('DO: expected games.result_ids after migration');
	}

	const counts = await doQuery('SELECT COUNT(*) AS count FROM games');
	const count = counts[0]?.count ?? 0;
	console.log(`DO: renamed games.trace_ids -> games.result_ids (${count} rows present)`);
}

async function main() {
	console.log(`Starting one-off trace -> result migration${deleteOld ? ' with old-key deletion' : ''}`);

	if (!skipKv) {
		await migrateKvSavedResults();
	} else {
		console.log('KV: skipped');
	}

	if (!skipDo) {
		await migrateVersusGamesTable();
	} else {
		console.log('DO: skipped');
	}

	console.log('Migration complete');
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
