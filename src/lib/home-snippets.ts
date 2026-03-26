/**
 * Homepage code samples — shared by +page.server (Shiki) and kept in one place.
 * Chain: seed KV → Load (kvRead) → Pack → Line — roll call, not role filtering.
 */
export const CHAIN_STEPS_FOR_CURL = [
	{
		name: 'Load',
		body: `const keys = await kv.list("user:");
const rows = [];
for (const key of keys) {
  const raw = await kv.get(key);
  rows.push(JSON.parse(raw));
}
return rows;`,
		capabilities: ['kvRead'],
	},
	{
		name: 'Pack',
		body: `return {
  n: input.length,
  names: input.map((u) => u.name),
};`,
		capabilities: [],
	},
	{
		name: 'Line',
		body: `return (
  "Roll call: " +
  input.names.join(", ") +
  " (" + input.n + ")"
);`,
		capabilities: [],
	},
] as const;

/** Bash single-quoted -d body: escape any `'` in JSON as `'\''` */
export function bashSingleQuoted(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}

const CHAIN_JSON = JSON.stringify({ steps: [...CHAIN_STEPS_FOR_CURL] });

export const SEED_CURL = 'curl -X POST https://lab.coey.dev/seed';

/** POST /run/chain — body matches seeded demo KV (three user:* rows). */
export const CHAIN_CURL = `curl -X POST https://lab.coey.dev/run/chain \\
  -H 'Content-Type: application/json' \\
  -d ${bashSingleQuoted(CHAIN_JSON)}`;

const SPAWN_JSON = JSON.stringify({
	body: 'const a = await spawn("return 10 * 10", []); const b = await spawn("return 20 * 20", []); return { a, b }',
	capabilities: ['spawn'],
	depth: 2,
});

export const SPAWN_PARALLEL_CURL = `curl -X POST https://lab.coey.dev/run/spawn \\
  -H 'Content-Type: application/json' \\
  -d ${bashSingleQuoted(SPAWN_JSON)}`;

/**
 * Homepage TypeScript sample — agent-oriented workflow.
 * Shows an agent building a self-healing pipeline and using the trace.
 */
export const CLIENT_SNIPPET = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: process.env.LAB_URL });

// Agent builds a self-healing chain.
// Each step = fresh V8 isolate. No shared state.
const out = await lab.runChain([
  {
    name: "Load broken data",
    body: \`return {
  raw: '{"users": [{"id": 1,}]}',
  source: "webhook-ingest",
};\`,
    capabilities: [],
  },
  {
    name: "Parse (will fail)",
    body: \`try {
  return { ok: true, data: JSON.parse(input.raw) };
} catch (e) {
  return { ok: false, error: e.message, raw: input.raw };
}\`,
    capabilities: [],
  },
  {
    name: "Heal",
    body: \`if (input.ok) return input;
const fixed = input.raw.replace(/,(\\\\s*[}\\\\]])/g, "$1");
return { ok: true, data: JSON.parse(fixed), healed: true };\`,
    capabilities: [],
  },
]);

// The trace is the proof. Share it with another agent or a reviewer.
console.log(out.result);   // { ok: true, data: {...}, healed: true }
console.log(out.traceId);  // → shareable URL`;

/** Illustrative RunResult.trace shape for seeded KV + Load → Pack → Line. */
export const EXAMPLE_RUN_RESULT_SHAPE = JSON.stringify(
	{
		ok: true,
		result: 'Roll call: Alice, Bob, Carol (3)',
		traceId: 'clu01example00shape00only',
		trace: [
			{
				step: 0,
				name: 'Load',
				template: 'guest@v1',
				capabilities: ['kvRead'],
				input: null,
				output: [
					{ name: 'Alice', role: 'admin' },
					{ name: 'Bob', role: 'viewer' },
					{ name: 'Carol', role: 'editor' },
				],
				ms: 14,
			},
			{
				step: 1,
				name: 'Pack',
				capabilities: [],
				input: [
					{ name: 'Alice', role: 'admin' },
					{ name: 'Bob', role: 'viewer' },
					{ name: 'Carol', role: 'editor' },
				],
				output: { n: 3, names: ['Alice', 'Bob', 'Carol'] },
				ms: 3,
			},
			{
				step: 2,
				name: 'Line',
				capabilities: [],
				input: { n: 3, names: ['Alice', 'Bob', 'Carol'] },
				output: 'Roll call: Alice, Bob, Carol (3)',
				ms: 2,
			},
		],
	},
	null,
	2,
);
