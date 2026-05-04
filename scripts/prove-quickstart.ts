import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'bun';

const timeoutMs = 7 * 60 * 1_000;
const started = Date.now();
const source = process.cwd();
const root = await mkdtemp(join(tmpdir(), 'lab-quickstart-'));
const clone = join(root, 'lab');

async function step(name: string, run: () => Promise<unknown>) {
	const stepStarted = Date.now();
	if (Date.now() - started > timeoutMs) {
		throw new Error(`quickstart exceeded 7 minutes before ${name}`);
	}
	await run();
	console.log(`${name}: ${Date.now() - stepStarted}ms`);
}

try {
	await step('clone', () => $`git clone --depth 1 ${source} ${clone}`.quiet());
	await step('install', () => $`bun install`.cwd(clone).quiet());
	await step('build-client', () => $`bun run build:client`.cwd(clone).quiet());
	await step('build-cli', () => $`bun run --cwd packages/lab-cli build`.cwd(clone).quiet());
	await step('demo-local-run', () => $`bun run demo:local-run`.cwd(clone).quiet());
	const elapsedMs = Date.now() - started;
	if (elapsedMs > timeoutMs) {
		throw new Error(`quickstart took ${elapsedMs}ms, over the 7 minute limit`);
	}
	console.log(JSON.stringify({ ok: true, elapsedMs, limitMs: timeoutMs }, null, 2));
} finally {
	if (!process.env.LAB_QUICKSTART_KEEP_REPO) {
		await rm(root, { recursive: true, force: true });
	}
}
