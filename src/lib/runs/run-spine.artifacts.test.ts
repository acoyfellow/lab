import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { createLabRun, resolveRunRepo } from './run-spine';

const tempRoots: string[] = [];

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function artifactsGateError(message: string, details?: unknown) {
	return new Error(
		`${message}\n` +
			'Cloudflare Artifacts REST control-plane gates require CLOUDFLARE_ACCOUNT_ID and a CLOUDFLARE_API_TOKEN scoped to that account with Account > Artifacts:Read and Account > Artifacts:Edit.\n' +
			(details ? `Details: ${JSON.stringify(details)}` : ''),
	);
}

describe('Lab Run north-star Artifacts gate', () => {
	test('existing Cloudflare Artifacts repo can be cloned and run through Lab', async () => {
		if (!process.env.LAB_ARTIFACTS_EXISTING_TEST) {
			console.log('skipping existing Artifacts gate; set LAB_ARTIFACTS_EXISTING_TEST=1');
			return;
		}
		const accountId = process.env.LAB_ARTIFACTS_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
		const namespace = process.env.LAB_ARTIFACTS_NAMESPACE;
		const name = process.env.LAB_ARTIFACTS_REPO;
		const branch = process.env.LAB_ARTIFACTS_BRANCH ?? 'main';
		const token = process.env.LAB_ARTIFACTS_REPO_TOKEN;
		if (!accountId || !namespace || !name || !token) {
			throw new Error(
				'LAB_ARTIFACTS_EXISTING_TEST requires LAB_ARTIFACTS_ACCOUNT_ID, LAB_ARTIFACTS_NAMESPACE, LAB_ARTIFACTS_REPO, and LAB_ARTIFACTS_REPO_TOKEN',
			);
		}

		const run = await createLabRun({
			repo: {
				type: 'artifacts',
				accountId,
				namespace,
				name,
				branch,
				token,
			},
			executor: { type: 'local' },
			command: ['sh', '-lc', 'git branch --show-current && git rev-parse HEAD'],
		});

		expect(run.status).toBe('succeeded');
		expect(run.logs.text).toContain(branch);
		expect(run.receipt.artifact.provider).toBe('artifacts');
		expect(run.receipt.artifact.namespace).toBe(namespace);
		expect(run.receipt.artifact.repo).toBe(name);
		expect(run.receipt.artifact.branch).toBe(branch);
		expect(run.receipt.artifact.head).toMatch(/^[0-9a-f]{40}$/);
	});

	test('real Cloudflare Artifacts repo can be created, cloned, pushed, resolved, and run', async () => {
		if (!process.env.LAB_ARTIFACTS_TEST) {
			console.log('skipping real Artifacts gate; set LAB_ARTIFACTS_TEST=1');
			return;
		}
		const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = process.env.CLOUDFLARE_API_TOKEN;
		if (!accountId || !apiToken) {
			throw artifactsGateError('LAB_ARTIFACTS_TEST is missing required environment.');
		}

		const namespace = `lab-test-${Date.now()}`;
		const name = `run-spine-${Math.random().toString(16).slice(2)}`;
		const apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/artifacts/namespaces/${namespace}`;
		const created = await fetch(`${apiBase}/repos`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${apiToken}`,
				'content-type': 'application/json',
			},
			body: JSON.stringify({ name }),
		});
		const createdJson = (await created.json()) as {
			success: boolean;
			result?: { remote: string; token: string };
			errors?: unknown[];
		};
		if (!created.ok || !createdJson.success) {
			throw artifactsGateError(`Artifacts repo create failed: HTTP ${created.status}`, createdJson.errors ?? createdJson);
		}
		expect(created.ok).toBe(true);
		expect(createdJson.success).toBe(true);
		expect(createdJson.result?.remote).toContain('/git/');
		expect(createdJson.result?.token).toMatch(/^art_v1_/);

		const clone = await mkdtemp(join(tmpdir(), 'lab-run-artifacts-'));
		tempRoots.push(clone);
		try {
			await $`git -c ${`http.extraHeader=Authorization: Bearer ${createdJson.result!.token}`} clone ${createdJson.result!.remote} .`
				.cwd(clone)
				.quiet();
			await $`git config user.email lab-run@example.test`.cwd(clone).quiet();
			await $`git config user.name "Lab Run Test"`.cwd(clone).quiet();
			await writeFile(join(clone, 'answer.txt'), 'artifacts works\n');
			await $`git add answer.txt`.cwd(clone).quiet();
			await $`git commit -m "seed artifacts run"`.cwd(clone).quiet();
			await $`git -c ${`http.extraHeader=Authorization: Bearer ${createdJson.result!.token}`} push origin main`
				.cwd(clone)
				.quiet();

			const resolved = await resolveRunRepo({
				type: 'artifacts',
				accountId,
				namespace,
				name,
				branch: 'main',
				token: createdJson.result!.token,
			});
			expect(resolved.type).toBe('working-copy');
			expect(resolved.path).toBeTruthy();

			const run = await createLabRun({
				repo: {
					type: 'artifacts',
					accountId,
					namespace,
					name,
					branch: 'main',
					token: createdJson.result!.token,
				},
				executor: { type: 'local' },
				command: ['sh', '-lc', 'cat answer.txt'],
			});

			expect(run.status).toBe('succeeded');
			expect(run.logs.text).toContain('artifacts works');
			expect(run.receipt.artifact.provider).toBe('artifacts');
			expect(run.receipt.artifact.namespace).toBe(namespace);
			expect(run.receipt.artifact.repo).toBe(name);
			expect(run.receipt.artifact.branch).toBe('main');
		} finally {
			await fetch(`${apiBase}/repos/${name}`, {
				method: 'DELETE',
				headers: { authorization: `Bearer ${apiToken}` },
			}).catch(() => undefined);
		}
	}, 30_000);
});
