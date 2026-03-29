#!/usr/bin/env node
/**
 * lab-cli — minimal CLI for Lab.
 *
 * Usage:
 *   lab run 'return 1 + 1'
 *   lab chain '[{"body":"return [1,2,3]","capabilities":[]},{"body":"return input.map(n=>n*2)","capabilities":[]}]'
 *   lab spawn 'const a = await spawn("return 10", []); return a'
 *   lab generate 'Sum the numbers 1 to 10'
 *   lab result <resultId>
 *   lab seed
 *
 * Environment:
 *   LAB_URL  — Lab app origin (default: http://localhost:5173)
 *
 * Every command prints JSON to stdout. Agents parse it. Humans read it.
 * Every run includes a resultId — the saved-result identifier.
 */

import { createLabClient, type ChainStep } from '@acoyfellow/lab';

class CliError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CliError';
	}
}

function getBaseUrl(): string {
	const raw = process.env.LAB_URL?.trim();
	return raw ? raw.replace(/\/+$/, '') : 'http://localhost:5173';
}

async function run(body: string) {
	return createLabClient({ baseUrl: getBaseUrl() }).runSandbox({ body, capabilities: [] });
}

async function chain(json: string) {
	let steps: ChainStep[];
	try {
		const parsed = JSON.parse(json);
		if (!Array.isArray(parsed)) throw new Error('chain argument must be a JSON array');
		steps = parsed as ChainStep[];
	} catch (error) {
		throw new CliError(`Invalid chain JSON: ${error instanceof Error ? error.message : String(error)}`);
	}

	return createLabClient({ baseUrl: getBaseUrl() }).runChain(steps);
}

async function spawn(body: string, depth = 2) {
	return createLabClient({ baseUrl: getBaseUrl() }).runSpawn({ body, capabilities: ['spawn'], depth });
}

async function generate(prompt: string) {
	return createLabClient({ baseUrl: getBaseUrl() }).runGenerate({ prompt, capabilities: [] });
}

async function fetchSavedResultJson(baseUrl: string, resultId: string) {
	const response = await fetch(`${baseUrl}/results/${resultId}.json`);
	if (!response.ok) {
		throw new Error(`GET /results/${resultId}.json failed with status ${response.status}`);
	}
	return response.json();
}

async function result(resultId: string) {
	return fetchSavedResultJson(getBaseUrl(), resultId);
}

async function seed() {
	return createLabClient({ baseUrl: getBaseUrl() }).seed();
}

const USAGE = `Usage:
  lab run <code>                    Run JS in a single isolate
  lab chain <stepsJson>             Run a multi-step chain
  lab spawn <code> [depth]          Run with spawn capability
  lab generate <prompt>             AI generates code, then runs it
  lab result <resultId>             Fetch saved-result JSON
  lab seed                          Seed demo KV data

Environment:
  LAB_URL   Lab app origin (default: http://localhost:5173)

Every command prints JSON to stdout. Every run includes a resultId.`;

async function route(args: string[]) {
	const cmd = args[0];
	const arg = args[1];

	if (!cmd || cmd === '--help' || cmd === '-h') {
		return USAGE;
	}

	switch (cmd) {
		case 'run':
			if (!arg) throw new CliError('lab run <code>');
			return run(arg);
		case 'chain':
			if (!arg) throw new CliError('lab chain <stepsJson>');
			return chain(arg);
		case 'spawn': {
			if (!arg) throw new CliError('lab spawn <code> [depth]');
			let depth = 2;
			if (args[2]) {
				depth = parseInt(args[2], 10);
				if (!Number.isInteger(depth) || depth < 1) {
					throw new CliError(`Invalid depth: "${args[2]}". Must be a positive integer.`);
				}
			}
			return spawn(arg, depth);
		}
		case 'generate':
			if (!arg) throw new CliError('lab generate <prompt>');
			return generate(arg);
		case 'result':
			if (!arg) throw new CliError('lab result <resultId>');
			return result(arg);
		case 'seed':
			return seed();
		default:
			throw new CliError(`Unknown command: ${cmd}\n\n${USAGE}`);
	}
}

async function main() {
	try {
		const output = await route(process.argv.slice(2));
		console.log(typeof output === 'string' ? output : JSON.stringify(output, null, 2));
	} catch (error) {
		if (error instanceof CliError) {
			console.error(error.message);
		} else if (error instanceof Error) {
			console.error(JSON.stringify({ error: error.message }, null, 2));
		} else {
			console.error(JSON.stringify({ error: String(error) }, null, 2));
		}
		process.exit(1);
	}
}

void main();
