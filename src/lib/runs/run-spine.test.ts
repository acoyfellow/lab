import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';
import {
	createLabRun,
	createRunReceipt,
	createSnapshotBranch,
	getLabRun,
	listLabRuns,
	redactLabSecrets,
	replayLabRun,
	type LabRunInput,
} from './run-spine';

const tempRoots: string[] = [];

async function makeGitRepo(name = 'repo') {
	const root = await mkdtemp(join(tmpdir(), `lab-run-${name}-`));
	tempRoots.push(root);
	await $`git init -b main`.cwd(root).quiet();
	await $`git config user.email lab-run@example.test`.cwd(root).quiet();
	await $`git config user.name "Lab Run Test"`.cwd(root).quiet();
	await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));
	await writeFile(join(root, 'answer.txt'), '41\n');
	await $`git add package.json answer.txt`.cwd(root).quiet();
	await $`git commit -m init`.cwd(root).quiet();
	return root;
}

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('Lab Run north-star spine', () => {
	test('local executor runs a real command in a real repo and writes logs, result, and receipt', async () => {
		const repo = await makeGitRepo('local');
		const run = await createLabRun({
			repo: { type: 'local', path: repo },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'printf "answer=" && cat answer.txt'],
		});

		expect(run.id).toMatch(/^run_/);
		expect(run.status).toBe('succeeded');
		expect(run.repo.type).toBe('local');
		expect(run.executor.type).toBe('local');
		expect(run.result.exitCode).toBe(0);
		expect(run.result.summary).toContain('succeeded');
		expect(run.logs.text).toContain('answer=41');
		expect(run.receipt.action).toBe('lab.run');
		expect(run.receipt.runId).toBe(run.id);
		expect(run.receipt.artifact.repo).toBe(repo);
		expect(run.receipt.output.result.exitCode).toBe(0);

		const persisted = await getLabRun(run.id, { root: repo });
		expect(persisted.id).toBe(run.id);
		expect(await readFile(persisted.paths.logs, 'utf8')).toContain('answer=41');
		expect(JSON.parse(await readFile(persisted.paths.result, 'utf8')).exitCode).toBe(0);
		expect(JSON.parse(await readFile(persisted.paths.receipt, 'utf8')).runId).toBe(run.id);
	});

	test('failed command is still a completed Lab Run with durable evidence', async () => {
		const repo = await makeGitRepo('failed');
		const run = await createLabRun({
			repo: { type: 'local', path: repo },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'echo "before failure"; exit 7'],
		});

		expect(run.status).toBe('failed');
		expect(run.result.exitCode).toBe(7);
		expect(run.logs.text).toContain('before failure');
		expect(run.receipt.output.status).toBe('failed');
		expect(run.receipt.output.result.exitCode).toBe(7);
		expect(await readFile(run.paths.logs, 'utf8')).toContain('before failure');
	});

	test('local executor timeout records a failed run with timeout evidence', async () => {
		const repo = await makeGitRepo('timeout');
		const run = await createLabRun({
			repo: { type: 'local', path: repo },
			executor: { type: 'local', timeoutMs: 100 },
			command: ['sh', '-lc', 'echo before-timeout; sleep 2; echo after-timeout'],
		});

		expect(run.status).toBe('failed');
		expect(run.result.exitCode).toBe(124);
		expect(run.result.timedOut).toBe(true);
		expect(run.result.summary).toContain('timed out');
		expect(run.logs.text).toContain('before-timeout');
		expect(run.logs.text).not.toContain('after-timeout');
		expect(run.receipt.output.result.timedOut).toBe(true);
		expect(JSON.parse(await readFile(run.paths.result, 'utf8')).timedOut).toBe(true);
	});

	test('run history lists recent receipts without reading unrelated repo files', async () => {
		const repo = await makeGitRepo('history');
		const first = await createLabRun({
			repo: { type: 'local', path: repo },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'echo first'],
		});
		const second = await createLabRun({
			repo: { type: 'local', path: repo },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'echo second'],
		});

		const runs = await listLabRuns({ root: repo });

		expect(runs.map((run) => run.id)).toEqual([second.id, first.id]);
		expect(runs[0].status).toBe('succeeded');
		expect(runs[0].command).toEqual(['sh', '-lc', 'echo second']);
		expect(runs[0].paths.logs).toContain('logs.txt');
		expect(runs[0].paths.receipt).toContain('receipt.json');
	});

	test('run history returns an empty list before a repo has Lab runs', async () => {
		const repo = await makeGitRepo('empty-history');

		await expect(listLabRuns({ root: repo })).resolves.toEqual([]);
	});

	test('replay re-runs a previous command and links the new receipt to the parent run', async () => {
		const repo = await makeGitRepo('replay');
		const first = await createLabRun({
			repo: { type: 'local', path: repo },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'cat answer.txt'],
		});
		await writeFile(join(repo, 'answer.txt'), '42\n');

		const replay = await replayLabRun(first.id, { root: repo });

		expect(replay.id).not.toBe(first.id);
		expect(replay.status).toBe('succeeded');
		expect(replay.logs.text).toContain('42');
		expect(replay.receipt.lineage?.parentRunId).toBe(first.id);
		expect(replay.receipt.input.command).toEqual(first.command);
	});

	test('snapshot mode turns dirty local work into a real lab branch and commit before running', async () => {
		const repo = await makeGitRepo('snapshot');
		await writeFile(join(repo, 'answer.txt'), '42\n');
		await writeFile(join(repo, 'new-file.txt'), 'created during dirty work\n');

		const run = await createLabRun({
			repo: { type: 'local', path: repo },
			snapshot: { mode: 'branch', prefix: 'lab/run' },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'git branch --show-current && cat answer.txt && test -f new-file.txt'],
		});

		expect(run.status).toBe('succeeded');
		expect(run.snapshot?.mode).toBe('branch');
		expect(run.snapshot?.branch).toMatch(/^lab\/run-/);
		expect(run.snapshot?.commit).toMatch(/^[0-9a-f]{7,40}$/);
		expect(run.logs.text).toContain(run.snapshot!.branch);
		expect(run.logs.text).toContain('42');
		expect((await $`git status --porcelain`.cwd(repo).text()).trim()).toBe('');
		expect((await $`git branch --show-current`.cwd(repo).text()).trim()).toBe(run.snapshot!.branch);
		expect(run.receipt.artifact.branch).toBe(run.snapshot!.branch);
		expect(run.receipt.artifact.head).toBe(run.snapshot!.commit);
	});

	test('snapshot helper is idempotent when repo is already clean', async () => {
		const repo = await makeGitRepo('clean-snapshot');
		const beforeHead = (await $`git rev-parse HEAD`.cwd(repo).text()).trim();

		const snapshot = await createSnapshotBranch({
			repo: { type: 'local', path: repo },
			prefix: 'lab/run',
		});

		expect(snapshot.mode).toBe('branch');
		expect(snapshot.branch).toMatch(/^lab\/run-/);
		expect(snapshot.commit).toBe(beforeHead);
		expect(snapshot.createdCommit).toBe(false);
		expect((await $`git status --porcelain`.cwd(repo).text()).trim()).toBe('');
	});

	test('receipt shape is enough for another process to understand and continue the run', async () => {
		const repo = await makeGitRepo('receipt');
		const receipt = await createRunReceipt({
			id: 'run_receipt_contract',
			repo: { type: 'local', path: repo },
			executor: { type: 'local' },
			command: ['sh', '-lc', 'echo ok'],
			status: 'succeeded',
			startedAt: '2026-05-03T00:00:00.000Z',
			finishedAt: '2026-05-03T00:00:01.000Z',
			result: {
				exitCode: 0,
				summary: 'command succeeded',
				durationMs: 1000,
			},
			logsPath: join(repo, '.lab/runs/run_receipt_contract/logs.txt'),
			resultPath: join(repo, '.lab/runs/run_receipt_contract/result.json'),
			parentRunId: 'run_parent_contract',
		});

		expect(receipt.source).toBe('lab');
		expect(receipt.schemaVersion).toBe('lab.run.receipt.v1');
		expect(receipt.action).toBe('lab.run');
		expect(receipt.runId).toBe('run_receipt_contract');
		expect(receipt.capabilities).toEqual(['filesystem.read', 'process.spawn']);
		expect(receipt.artifact.repo).toBe(repo);
		expect(receipt.input.command).toEqual(['sh', '-lc', 'echo ok']);
		expect(receipt.output.status).toBe('succeeded');
		expect(receipt.output.result.exitCode).toBe(0);
		expect(receipt.replay.available).toBe(true);
		expect(receipt.replay.mode).toBe('continue-from-here');
		expect(receipt.lineage?.parentRunId).toBe('run_parent_contract');
		expect(receipt.evidence.logsPath).toContain('logs.txt');
		expect(receipt.evidence.resultPath).toContain('result.json');
	});

	test('run input already speaks Artifacts even before every executor supports it', () => {
		const input = {
			repo: {
				type: 'artifacts',
				namespace: 'default',
				name: 'deja',
				branch: 'main',
			},
			executor: { type: 'local' },
			command: ['bun', 'test'],
		} satisfies LabRunInput;

		expect(input.repo.type).toBe('artifacts');
		expect(input.repo.namespace).toBe('default');
		expect(input.repo.name).toBe('deja');
		expect(input.repo.branch).toBe('main');
	});

	test('durable evidence redacts Cloudflare and Artifacts tokens', async () => {
		const repo = await makeGitRepo('artifacts-source');
		const secret = 'art_v1_0123456789abcdef0123456789abcdef01234567?expires=1760000000';
		const run = await createLabRun({
			repo: {
				type: 'artifacts',
				namespace: 'default',
				name: 'artifacts-source',
				branch: 'main',
				remote: repo,
				token: secret,
			},
			executor: { type: 'local' },
			command: ['sh', '-lc', `printf '%s\\n' '${secret}' 'cfut_abcdefghijklmnopqrstuvwxyz0123456789_-TOKEN'`],
		});

		expect(run.status).toBe('succeeded');
		expect(run.logs.text).toContain('[redacted-artifacts-token]');
		expect(run.logs.text).toContain('[redacted-cloudflare-token]');
		expect(run.logs.text).not.toContain(secret);
		expect(await readFile(run.paths.logs, 'utf8')).not.toContain(secret);
		expect(await readFile(run.paths.input, 'utf8')).not.toContain(secret);
		expect(await readFile(run.paths.receipt, 'utf8')).not.toContain(secret);
	});

	test('secret redaction covers Cloudflare API and Artifacts repo tokens', () => {
		expect(
			redactLabSecrets(
				'cfut_abcdefghijklmnopqrstuvwxyz0123456789_-TOKEN art_v1_0123456789abcdef0123456789abcdef01234567?expires=1760000000',
			),
		).toBe('[redacted-cloudflare-token] [redacted-artifacts-token]');
	});
});
