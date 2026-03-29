#!/usr/bin/env node
/**
 * lab-cli — minimal CLI for Lab, built on Effect v4.
 *
 * Usage:
 *   lab run 'return 1 + 1'
 *   lab chain '[{"body":"return [1,2,3]","capabilities":[]},{"body":"return input.map(n=>n*2)","capabilities":[]}]'
 *   lab spawn 'const a = await spawn("return 10", []); return a'
 *   lab generate 'Sum the numbers 1 to 10'
 *   lab trace <traceId>
 *   lab seed
 *
 * Environment:
 *   LAB_URL  — Lab app origin (default: http://localhost:5173)
 *
 * Every command prints JSON to stdout. Agents parse it. Humans read it.
 * Every run includes a traceId — the saved-result identifier.
 */

import { Effect, Data } from 'effect';
import {
	createLabEffectClient,
	HttpError,
} from '@acoyfellow/lab/effect';
import type { ChainStep } from '@acoyfellow/lab';

// ── Errors ──────────────────────────────────────────────────────────────

class CliError extends Data.TaggedError('CliError')<{
	readonly message: string;
}> {}

// ── Config ──────────────────────────────────────────────────────────────

const getBaseUrl = Effect.sync(() => {
	const raw = process.env.LAB_URL?.trim();
	return raw ? raw.replace(/\/+$/, '') : 'http://localhost:5173';
});

// ── Commands ────────────────────────────────────────────────────────────

const run = (body: string) =>
	Effect.gen(function* () {
		const baseUrl = yield* getBaseUrl;
		const lab = createLabEffectClient({ baseUrl });
		return yield* lab.runSandbox({ body, capabilities: [] });
	});

const chain = (json: string) =>
	Effect.gen(function* () {
		const steps = yield* Effect.try({
			try: () => {
				const parsed = JSON.parse(json);
				if (!Array.isArray(parsed)) throw new Error('chain argument must be a JSON array');
				return parsed as ChainStep[];
			},
			catch: (e) => new CliError({ message: `Invalid chain JSON: ${e instanceof Error ? e.message : String(e)}` }),
		});
		const baseUrl = yield* getBaseUrl;
		const lab = createLabEffectClient({ baseUrl });
		return yield* lab.runChain(steps);
	});

const spawn = (body: string, depth = 2) =>
	Effect.gen(function* () {
		const baseUrl = yield* getBaseUrl;
		const lab = createLabEffectClient({ baseUrl });
		return yield* lab.runSpawn({ body, capabilities: ['spawn'], depth });
	});

const generate = (prompt: string) =>
	Effect.gen(function* () {
		const baseUrl = yield* getBaseUrl;
		const lab = createLabEffectClient({ baseUrl });
		return yield* lab.runGenerate({ prompt, capabilities: [] });
	});

const trace = (traceId: string) =>
	Effect.gen(function* () {
		const baseUrl = yield* getBaseUrl;
		const lab = createLabEffectClient({ baseUrl });
		return yield* lab.getTraceJson(traceId);
	});

const seed = Effect.gen(function* () {
	const baseUrl = yield* getBaseUrl;
	const lab = createLabEffectClient({ baseUrl });
	return yield* lab.seed();
});

// ── Router ──────────────────────────────────────────────────────────────

const USAGE = `Usage:
  lab run <code>                   Run JS in a single isolate
  lab chain <stepsJson>            Run a multi-step chain
  lab spawn <code> [depth]         Run with spawn capability
  lab generate <prompt>            AI generates code, then runs it
  lab trace <traceId>              Fetch saved-result JSON
  lab seed                         Seed demo KV data

Environment:
  LAB_URL   Lab app origin (default: http://localhost:5173)

Every command prints JSON to stdout. Every run includes a traceId.`;

const route = (args: string[]) => {
	const cmd = args[0];
	const arg = args[1];

	if (!cmd || cmd === '--help' || cmd === '-h') {
		return Effect.sync(() => USAGE);
	}

	switch (cmd) {
		case 'run':
			if (!arg) return Effect.fail(new CliError({ message: 'lab run <code>' }));
			return run(arg);
		case 'chain':
			if (!arg) return Effect.fail(new CliError({ message: 'lab chain <stepsJson>' }));
			return chain(arg);
		case 'spawn': {
			if (!arg) return Effect.fail(new CliError({ message: 'lab spawn <code> [depth]' }));
			let depth = 2;
			if (args[2]) {
				depth = parseInt(args[2], 10);
				if (!Number.isInteger(depth) || depth < 1) {
					return Effect.fail(new CliError({ message: `Invalid depth: "${args[2]}". Must be a positive integer.` }));
				}
			}
			return spawn(arg, depth);
		}
		case 'generate':
			if (!arg) return Effect.fail(new CliError({ message: 'lab generate <prompt>' }));
			return generate(arg);
		case 'trace':
			if (!arg) return Effect.fail(new CliError({ message: 'lab trace <traceId>' }));
			return trace(arg);
		case 'seed':
			return seed;
		default:
			return Effect.fail(new CliError({ message: `Unknown command: ${cmd}\n\n${USAGE}` }));
	}
};

// ── Main ────────────────────────────────────────────────────────────────

const main = Effect.gen(function* () {
	const args = process.argv.slice(2);
	const result = yield* route(args);
	const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
	console.log(output);
}).pipe(
	Effect.catchTag('HttpError', (e: HttpError) => {
		console.error(JSON.stringify({ error: e.message }, null, 2));
		return Effect.sync(() => process.exit(1));
	}),
	Effect.catchTag('CliError', (e: CliError) => {
		console.error(e.message);
		return Effect.sync(() => process.exit(1));
	}),
	Effect.catchCause((cause) => {
		console.error(JSON.stringify({ error: String(cause) }, null, 2));
		return Effect.sync(() => process.exit(1));
	}),
);

Effect.runPromise(main);
