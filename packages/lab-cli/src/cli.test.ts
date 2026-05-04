import { afterEach, describe, expect, test } from 'bun:test';
import { $ } from 'bun';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempRoots: string[] = [];
const cli = join(import.meta.dir, 'cli.ts');

afterEach(async () => {
	await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function makeGitRepo(name = 'repo') {
	const root = await mkdtemp(join(tmpdir(), `lab-cli-${name}-`));
	tempRoots.push(root);
	await $`git init -b main`.cwd(root).quiet();
	await $`git config user.email lab-cli@example.test`.cwd(root).quiet();
	await $`git config user.name "Lab CLI Test"`.cwd(root).quiet();
	await writeFile(join(root, 'answer.txt'), '42\n');
	await $`git add answer.txt`.cwd(root).quiet();
	await $`git commit -m init`.cwd(root).quiet();
	return root;
}

async function runCli(args: string[]) {
	const proc = Bun.spawn(['bun', cli, ...args], {
		stdout: 'pipe',
		stderr: 'pipe',
		env: { ...process.env },
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { stdout, stderr, exitCode };
}

describe('lab-cli repo contract', () => {
	test('repo-run prints stable JSON for successful local runs', async () => {
		const repo = await makeGitRepo('success');
		const result = await runCli(['repo-run', '--repo', repo, '--', 'sh', '-lc', 'cat answer.txt']);

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe('');
		const json = JSON.parse(result.stdout);
		expect(json.id).toMatch(/^run_/);
		expect(json.status).toBe('succeeded');
		expect(json.result.exitCode).toBe(0);
		expect(json.receipt.schemaVersion).toBe('lab.run.receipt.v1');
		expect(json.receipt.input.command).toEqual(['sh', '-lc', 'cat answer.txt']);
		expect(json.paths.receipt).toContain('receipt.json');
	});

	test('repo-run --timeout-ms returns a JSON failed run instead of hanging', async () => {
		const repo = await makeGitRepo('timeout');
		const result = await runCli([
			'repo-run',
			'--repo',
			repo,
			'--timeout-ms',
			'100',
			'--',
			'sh',
			'-lc',
			'sleep 2',
		]);

		expect(result.exitCode).toBe(0);
		const json = JSON.parse(result.stdout);
		expect(json.status).toBe('failed');
		expect(json.result.exitCode).toBe(124);
		expect(json.result.timedOut).toBe(true);
		expect(json.receipt.output.result.timedOut).toBe(true);
	});

	test('CLI errors are machine-readable JSON on stderr', async () => {
		const result = await runCli(['runs', '--repo', '.', '--limit', '0']);

		expect(result.exitCode).toBe(1);
		expect(result.stdout).toBe('');
		const json = JSON.parse(result.stderr);
		expect(json).toEqual({
			ok: false,
			error: {
				name: 'CliError',
				message: 'Invalid --limit value: "0". Must be a positive integer.',
			},
		});
	});
});
