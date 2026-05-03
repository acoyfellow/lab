import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { $ } from 'bun';

export type LocalRepoRef = {
	type: 'local';
	path: string;
};

export type ArtifactsRepoRef = {
	type: 'artifacts';
	accountId?: string;
	namespace: string;
	name: string;
	branch: string;
	token?: string;
	remote?: string;
};

export type LabRunRepo = LocalRepoRef | ArtifactsRepoRef;

export type LabRunExecutor = {
	type: 'local';
};

export type LabRunInput = {
	repo: LabRunRepo;
	snapshot?: { mode: 'branch'; prefix?: string };
	executor: LabRunExecutor;
	command: string[];
};

export type LabRunStatus = 'succeeded' | 'failed';

export type LabRunResult = {
	exitCode: number;
	summary: string;
	durationMs: number;
};

export type LabRunReceipt = {
	source: 'lab';
	action: 'lab.run';
	runId: string;
	capabilities: string[];
	artifact: {
		provider: 'local' | 'artifacts';
		repo: string;
		branch?: string;
		head?: string;
		namespace?: string;
	};
	input: {
		command: string[];
		executor: LabRunExecutor;
	};
	output: {
		status: LabRunStatus;
		result: LabRunResult;
	};
	evidence: {
		logsPath: string;
		resultPath: string;
	};
	replay: {
		available: boolean;
		mode: 'continue-from-here';
	};
	startedAt: string;
	finishedAt: string;
};

export type LabRun = {
	id: string;
	status: LabRunStatus;
	repo: LabRunRepo;
	executor: LabRunExecutor;
	command: string[];
	snapshot?: { mode: 'branch'; branch: string; commit: string; createdCommit: boolean };
	result: LabRunResult;
	logs: { text: string };
	receipt: LabRunReceipt;
	paths: {
		dir: string;
		input: string;
		logs: string;
		result: string;
		receipt: string;
	};
};

export type ResolvedRunRepo = {
	type: 'working-copy';
	path: string;
	source: LabRunRepo;
};

function runId() {
	return `run_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${Math.random().toString(16).slice(2, 8)}`;
}

function runRoot(repoPath: string) {
	return join(repoPath, '.lab', 'runs');
}

async function excludeLabMetadata(repoPath: string) {
	const excludePath = join(repoPath, '.git', 'info', 'exclude');
	try {
		const current = await readFile(excludePath, 'utf8');
		if (current.split(/\r?\n/).includes('.lab/')) return;
		await writeFile(excludePath, `${current.replace(/\s*$/, '\n')}.lab/\n`);
	} catch {
		// Non-git working copies can still use Lab Run persistence.
	}
}

function artifactFor(repo: LabRunRepo, branch?: string, head?: string): LabRunReceipt['artifact'] {
	if (repo.type === 'artifacts') {
		return {
			provider: 'artifacts',
			repo: repo.name,
			namespace: repo.namespace,
			branch: branch ?? repo.branch,
			head,
		};
	}
	return {
		provider: 'local',
		repo: repo.path,
		branch,
		head,
	};
}

export async function createRunReceipt(input: {
	id: string;
	repo: LabRunRepo;
	executor: LabRunExecutor;
	command: string[];
	status: LabRunStatus;
	startedAt: string;
	finishedAt: string;
	result: LabRunResult;
	logsPath: string;
	resultPath: string;
	branch?: string;
	head?: string;
}): Promise<LabRunReceipt> {
	return {
		source: 'lab',
		action: 'lab.run',
		runId: input.id,
		capabilities: ['filesystem.read', 'process.spawn'],
		artifact: artifactFor(input.repo, input.branch, input.head),
		input: {
			command: input.command,
			executor: input.executor,
		},
		output: {
			status: input.status,
			result: input.result,
		},
		evidence: {
			logsPath: input.logsPath,
			resultPath: input.resultPath,
		},
		replay: {
			available: true,
			mode: 'continue-from-here',
		},
		startedAt: input.startedAt,
		finishedAt: input.finishedAt,
	};
}

export async function createSnapshotBranch(input: {
	repo: LocalRepoRef;
	prefix?: string;
}): Promise<{ mode: 'branch'; branch: string; commit: string; createdCommit: boolean }> {
	const prefix = input.prefix ?? 'lab/run';
	const branch = `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(16).slice(2, 8)}`;
	await $`git switch -c ${branch}`.cwd(input.repo.path).quiet();
	const dirty = (await $`git status --porcelain`.cwd(input.repo.path).text()).trim();
	if (!dirty) {
		const commit = (await $`git rev-parse HEAD`.cwd(input.repo.path).text()).trim();
		return { mode: 'branch', branch, commit, createdCommit: false };
	}
	await $`git add -A`.cwd(input.repo.path).quiet();
	await $`git commit -m ${`lab run snapshot ${branch}`}`.cwd(input.repo.path).quiet();
	const commit = (await $`git rev-parse HEAD`.cwd(input.repo.path).text()).trim();
	return { mode: 'branch', branch, commit, createdCommit: true };
}

function remoteWithToken(repo: ArtifactsRepoRef) {
	const remote = repo.remote ?? `https://${repo.accountId}.artifacts.cloudflare.net/git/${repo.namespace}/${repo.name}.git`;
	if (!repo.token) return remote;
	return remote.replace('https://', `https://x-token:${repo.token}@`);
}

export async function resolveRunRepo(repo: LabRunRepo): Promise<ResolvedRunRepo> {
	if (repo.type === 'local') return { type: 'working-copy', path: repo.path, source: repo };
	const path = await mkdtemp(join(tmpdir(), `lab-run-artifacts-${basename(repo.name)}-`));
	await $`git clone --branch ${repo.branch} ${remoteWithToken(repo)} ${path}`.quiet();
	return { type: 'working-copy', path, source: repo };
}

export async function createLabRun(input: LabRunInput): Promise<LabRun> {
	const id = runId();
	const resolved = await resolveRunRepo(input.repo);
	let runRepo = input.repo;
	let snapshot: LabRun['snapshot'];
	if (input.snapshot?.mode === 'branch') {
		if (runRepo.type !== 'local') {
			runRepo = { type: 'local', path: resolved.path };
		}
		snapshot = await createSnapshotBranch({
			repo: { type: 'local', path: resolved.path },
			prefix: input.snapshot.prefix,
		});
	}
	await excludeLabMetadata(resolved.path);
	const dir = join(runRoot(resolved.path), id);
	await mkdir(dir, { recursive: true });
	const paths = {
		dir,
		input: join(dir, 'input.json'),
		logs: join(dir, 'logs.txt'),
		result: join(dir, 'result.json'),
		receipt: join(dir, 'receipt.json'),
	};
	const startedAt = new Date().toISOString();
	const started = Date.now();
	const proc = Bun.spawn(input.command, {
		cwd: resolved.path,
		stdout: 'pipe',
		stderr: 'pipe',
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	const finishedAt = new Date().toISOString();
	const logsText = `${stdout}${stderr}`;
	const status: LabRunStatus = exitCode === 0 ? 'succeeded' : 'failed';
	const result: LabRunResult = {
		exitCode,
		summary: `command ${status}`,
		durationMs: Date.now() - started,
	};
	const head = await $`git rev-parse HEAD`.cwd(resolved.path).text().then((text) => text.trim()).catch(() => undefined);
	const branch = snapshot?.branch ?? await $`git branch --show-current`.cwd(resolved.path).text().then((text) => text.trim()).catch(() => undefined);
	const receipt = await createRunReceipt({
		id,
		repo: input.repo,
		executor: input.executor,
		command: input.command,
		status,
		startedAt,
		finishedAt,
		result,
		logsPath: paths.logs,
		resultPath: paths.result,
		branch: branch || undefined,
		head: snapshot?.commit ?? head,
	});
	await writeFile(paths.input, JSON.stringify(input, null, 2) + '\n');
	await writeFile(paths.logs, logsText);
	await writeFile(paths.result, JSON.stringify(result, null, 2) + '\n');
	await writeFile(paths.receipt, JSON.stringify(receipt, null, 2) + '\n');
	return {
		id,
		status,
		repo: input.repo,
		executor: input.executor,
		command: input.command,
		snapshot,
		result,
		logs: { text: logsText },
		receipt,
		paths,
	};
}

export async function getLabRun(id: string, opts: { root: string }): Promise<LabRun> {
	const dir = join(runRoot(opts.root), id);
	const paths = {
		dir,
		input: join(dir, 'input.json'),
		logs: join(dir, 'logs.txt'),
		result: join(dir, 'result.json'),
		receipt: join(dir, 'receipt.json'),
	};
	const input = JSON.parse(await readFile(paths.input, 'utf8')) as LabRunInput;
	const result = JSON.parse(await readFile(paths.result, 'utf8')) as LabRunResult;
	const receipt = JSON.parse(await readFile(paths.receipt, 'utf8')) as LabRunReceipt;
	const logsText = await readFile(paths.logs, 'utf8');
	return {
		id,
		status: receipt.output.status,
		repo: input.repo,
		executor: input.executor,
		command: input.command,
		result,
		logs: { text: logsText },
		receipt,
		paths,
	};
}
