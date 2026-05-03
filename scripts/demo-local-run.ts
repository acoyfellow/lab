import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import { createLabRun, getLabRun, listLabRuns, replayLabRun } from '../packages/lab/src/run-spine.js';

const repo = await mkdtemp(join(tmpdir(), 'lab-demo-'));

try {
	await $`git init -b main`.cwd(repo).quiet();
	await $`git config user.email lab-demo@example.test`.cwd(repo).quiet();
	await $`git config user.name "Lab Demo"`.cwd(repo).quiet();
	await writeFile(join(repo, 'answer.txt'), '41\n');
	await writeFile(
		join(repo, 'package.json'),
		JSON.stringify({ type: 'module', scripts: { test: 'test "$(cat answer.txt)" = "42"' } }, null, 2) + '\n',
	);
	await $`git add answer.txt package.json`.cwd(repo).quiet();
	await $`git commit -m init`.cwd(repo).quiet();

	await writeFile(join(repo, 'answer.txt'), '42\n');
	const run = await createLabRun({
		repo: { type: 'local', path: repo },
		snapshot: { mode: 'branch', prefix: 'lab/run' },
		executor: { type: 'local' },
		command: ['sh', '-lc', 'npm test'],
	});
	const replay = await replayLabRun(run.id, { root: repo });
	const runs = await listLabRuns({ root: repo });
	const shown = await getLabRun(run.id, { root: repo });

	console.log(
		JSON.stringify(
			{
				repo,
				run: {
					id: run.id,
					status: run.status,
					branch: run.receipt.artifact.branch,
					head: run.receipt.artifact.head,
					receiptPath: run.paths.receipt,
				},
				replay: {
					id: replay.id,
					status: replay.status,
					parentRunId: replay.receipt.lineage?.parentRunId,
				},
				listedRuns: runs.map((item) => ({ id: item.id, status: item.status, command: item.command })),
				show: {
					id: shown.id,
					logs: shown.logs.text,
				},
			},
			null,
			2,
		),
	);
} finally {
	if (!process.env.LAB_DEMO_KEEP_REPO) {
		await rm(repo, { recursive: true, force: true });
	}
}
