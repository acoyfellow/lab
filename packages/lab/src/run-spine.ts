import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawn } from 'node:child_process';

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
	parentRunId?: string;
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
	lineage?: {
		parentRunId?: string;
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

export type LabRunSummary = {
	id: string;
	status: LabRunStatus;
	command: string[];
	branch?: string;
	head?: string;
	durationMs: number;
	startedAt: string;
	finishedAt: string;
	paths: {
		dir: string;
		receipt: string;
		logs: string;
		result: string;
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

type CommandResult = {
	stdout: string;
	stderr: string;
	exitCode: number;
};

export function redactLabSecrets(value: string): string {
	return value
		.replace(/cfut_[A-Za-z0-9_-]+/g, '[redacted-cloudflare-token]')
		.replace(/art_v1_[A-Za-z0-9._~+/?=&%-]+/g, '[redacted-artifacts-token]');
}

function redactCommand(command: string[]) {
	return command.map((part) => redactLabSecrets(part));
}

async function runCommand(command: string[], cwd: string): Promise<CommandResult> {
	if (command.length === 0) {
		throw new Error('Lab run command must not be empty');
	}
	return new Promise((resolve, reject) => {
		const child = spawn(command[0]!, command.slice(1), { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code) => {
			resolve({ stdout, stderr, exitCode: code ?? 1 });
		});
	});
}

async function runGit(cwd: string, args: string[]) {
	const result = await runCommand(['git', ...args], cwd);
	if (result.exitCode !== 0) {
		throw new Error(redactLabSecrets(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`));
	}
	return result.stdout.trim();
}

async function maybeRunGit(cwd: string, args: string[]) {
	try {
		return await runGit(cwd, args);
	} catch {
		return undefined;
	}
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
	parentRunId?: string;
}): Promise<LabRunReceipt> {
	return {
		source: 'lab',
		action: 'lab.run',
		runId: input.id,
		capabilities: ['filesystem.read', 'process.spawn'],
		artifact: artifactFor(input.repo, input.branch, input.head),
		input: {
			command: redactCommand(input.command),
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
		lineage: input.parentRunId ? { parentRunId: input.parentRunId } : undefined,
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
	await runGit(input.repo.path, ['switch', '-c', branch]);
	const dirty = await runGit(input.repo.path, ['status', '--porcelain']);
	if (!dirty) {
		const commit = await runGit(input.repo.path, ['rev-parse', 'HEAD']);
		return { mode: 'branch', branch, commit, createdCommit: false };
	}
	await runGit(input.repo.path, ['add', '-A']);
	await runGit(input.repo.path, ['commit', '-m', `lab run snapshot ${branch}`]);
	const commit = await runGit(input.repo.path, ['rev-parse', 'HEAD']);
	return { mode: 'branch', branch, commit, createdCommit: true };
}

function artifactsRemote(repo: ArtifactsRepoRef) {
	const remote = repo.remote ?? `https://${repo.accountId}.artifacts.cloudflare.net/git/${repo.namespace}/${repo.name}.git`;
	if (!repo.token) return remote;
	return remote;
}

function artifactsGitArgs(repo: ArtifactsRepoRef) {
	if (!repo.token) return [];
	return ['-c', `http.extraHeader=Authorization: Bearer ${repo.token}`];
}

function persistedRunInput(input: LabRunInput): LabRunInput {
	const persisted = {
		...input,
		command: redactCommand(input.command),
	};
	if (input.repo.type !== 'artifacts' || !input.repo.token) return persisted;
	const { token, ...repo } = input.repo;
	return {
		...persisted,
		repo,
	};
}

export async function resolveRunRepo(repo: LabRunRepo): Promise<ResolvedRunRepo> {
	if (repo.type === 'local') return { type: 'working-copy', path: repo.path, source: repo };
	const path = await mkdtemp(join(tmpdir(), `lab-run-artifacts-${basename(repo.name)}-`));
	await runGit(process.cwd(), [...artifactsGitArgs(repo), 'clone', '--branch', repo.branch, artifactsRemote(repo), path]);
	return { type: 'working-copy', path, source: repo };
}

export async function createLabRun(input: LabRunInput): Promise<LabRun> {
	const id = runId();
	const resolved = await resolveRunRepo(input.repo);
	let snapshot: LabRun['snapshot'];
	if (input.snapshot?.mode === 'branch') {
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
	const { stdout, stderr, exitCode } = await runCommand(input.command, resolved.path);
	const finishedAt = new Date().toISOString();
	const logsText = redactLabSecrets(`${stdout}${stderr}`);
	const status: LabRunStatus = exitCode === 0 ? 'succeeded' : 'failed';
	const result: LabRunResult = {
		exitCode,
		summary: `command ${status}`,
		durationMs: Date.now() - started,
	};
	const head = await maybeRunGit(resolved.path, ['rev-parse', 'HEAD']);
	const branch = snapshot?.branch ?? (await maybeRunGit(resolved.path, ['branch', '--show-current']));
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
		parentRunId: input.parentRunId,
	});
	await writeFile(paths.input, JSON.stringify(persistedRunInput(input), null, 2) + '\n');
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

export async function replayLabRun(id: string, opts: { root: string; snapshot?: boolean }): Promise<LabRun> {
	const previous = await getLabRun(id, opts);
	return createLabRun({
		repo: previous.repo.type === 'local' ? { type: 'local', path: opts.root } : previous.repo,
		snapshot: opts.snapshot ? { mode: 'branch', prefix: 'lab/run' } : undefined,
		executor: previous.executor,
		command: previous.command,
		parentRunId: id,
	});
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

export async function listLabRuns(opts: { root: string; limit?: number }): Promise<LabRunSummary[]> {
	const root = runRoot(opts.root);
	let entries: { id: string; dir: string; updatedAt: number }[];
	try {
		const dirents = await readdir(root, { withFileTypes: true });
		entries = await Promise.all(
			dirents
				.filter((dirent) => dirent.isDirectory() && dirent.name.startsWith('run_'))
				.map(async (dirent) => {
					const dir = join(root, dirent.name);
					const info = await stat(dir);
					return { id: dirent.name, dir, updatedAt: info.mtimeMs };
				}),
		);
	} catch {
		return [];
	}

	const summaries = await Promise.all(
		entries
			.sort((a, b) => b.updatedAt - a.updatedAt)
			.slice(0, opts.limit ?? 20)
			.map(async ({ id, dir }) => {
				const paths = {
					dir,
					receipt: join(dir, 'receipt.json'),
					logs: join(dir, 'logs.txt'),
					result: join(dir, 'result.json'),
				};
				const receipt = JSON.parse(await readFile(paths.receipt, 'utf8')) as LabRunReceipt;
				return {
					id,
					status: receipt.output.status,
					command: receipt.input.command,
					branch: receipt.artifact.branch,
					head: receipt.artifact.head,
					durationMs: receipt.output.result.durationMs,
					startedAt: receipt.startedAt,
					finishedAt: receipt.finishedAt,
					paths,
				};
			}),
	);
	return summaries;
}
