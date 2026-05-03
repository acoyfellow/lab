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

describe('Lab Run north-star Artifacts gate', () => {
	test('real Cloudflare Artifacts repo can be created, cloned, pushed, resolved, and run', async () => {
		if (!process.env.LAB_ARTIFACTS_TEST) {
			console.log('skipping real Artifacts gate; set LAB_ARTIFACTS_TEST=1');
			return;
		}
		const accountId = process.env.CLOUDFLARE_PERSONAL_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
		const apiToken = process.env.CLOUDFLARE_PERSONAL_API_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
		if (!accountId || !apiToken) {
			throw new Error('LAB_ARTIFACTS_TEST requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN');
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
			throw new Error(
				`Artifacts repo create failed: HTTP ${created.status} ${JSON.stringify(createdJson.errors ?? createdJson)}`,
			);
		}
		expect(created.ok).toBe(true);
		expect(createdJson.success).toBe(true);
		expect(createdJson.result?.remote).toContain('/git/');
		expect(createdJson.result?.token).toMatch(/^art_v1_/);

		const clone = await mkdtemp(join(tmpdir(), 'lab-run-artifacts-'));
		tempRoots.push(clone);
		try {
			const authedRemote = createdJson.result!.remote.replace(
				'https://',
				`https://x-token:${createdJson.result!.token}@`,
			);
			await $`git clone ${authedRemote} .`.cwd(clone).quiet();
			await $`git config user.email lab-run@example.test`.cwd(clone).quiet();
			await $`git config user.name "Lab Run Test"`.cwd(clone).quiet();
			await writeFile(join(clone, 'answer.txt'), 'artifacts works\n');
			await $`git add answer.txt`.cwd(clone).quiet();
			await $`git commit -m "seed artifacts run"`.cwd(clone).quiet();
			await $`git push origin main`.cwd(clone).quiet();

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
	});
});
