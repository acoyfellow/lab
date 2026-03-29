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

export const SEED_CURL = 'curl -X POST $LAB_URL/seed';

/** POST /run/chain — body matches seeded demo KV (three user:* rows). */
export const CHAIN_CURL = `curl -X POST $LAB_URL/run/chain \\
  -H 'Content-Type: application/json' \\
  -d ${bashSingleQuoted(CHAIN_JSON)}`;

const SPAWN_JSON = JSON.stringify({
	body: 'const a = await spawn("return 10 * 10", []); const b = await spawn("return 20 * 20", []); return { a, b }',
	capabilities: ['spawn'],
	depth: 2,
});

export const SPAWN_PARALLEL_CURL = `curl -X POST $LAB_URL/run/spawn \\
  -H 'Content-Type: application/json' \\
  -d ${bashSingleQuoted(SPAWN_JSON)}`;

/**
 * Homepage TypeScript sample — agent-oriented workflow.
 * Shows an agent building a self-healing pipeline and using the saved result.
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

// The saved result is the proof. Share it with another agent or a reviewer.
console.log(out.result);   // { ok: true, data: {...}, healed: true }
console.log(out.traceId);  // → JSON: /t/<id>.json, viewer: /t/<id>`;

// ═══════════════════════════════════════════════════════════════════════════
// "You've used these before" — recognizable agent patterns mapped to Lab
// ═══════════════════════════════════════════════════════════════════════════

export const KNOWN_PATTERNS = [
  {
    id: 'code-mode',
    tab: 'Code Mode',
    knownFrom: 'Cursor, Claude Code',
    whatItDoes: 'Write a function → run tests → prove it works',
    lines: 14,
    code: `const out = await lab.runChain([
  { name: "Write",  body: \`
    function parseAmount(raw) {
      if (!raw) return null;
      const n = parseFloat(String(raw).replace(/[^\\\\d.\\\\-]/g, ""));
      return isNaN(n) ? null : Math.round(n * 100) / 100;
    }
    return { fn: parseAmount.toString() };
  \`, capabilities: [] },
  { name: "Test",   body: \`
    \${input.fn}
    const cases = [
      { in: "$1,234.56", expect: 1234.56 },
      { in: "free",      expect: null },
      { in: null,        expect: null },
    ];
    return cases.map(c => ({
      ...c, actual: parseAmount(c.in),
      pass: parseAmount(c.in) === c.expect,
    }));
  \`, capabilities: [] },
  { name: "Verdict", body: \`
    const passed = input.filter(r => r.pass).length;
    return { score: passed + "/" + input.length,
             verdict: passed === input.length ? "PASS" : "FAIL" };
  \`, capabilities: [] },
]);
// → saved result URL proves 3/3 pass. Ship the receipt, not "trust me."`,
  },
  {
    id: 'deep-research',
    tab: 'Deep Research',
    knownFrom: 'Perplexity, Gemini Deep Research',
    whatItDoes: 'Gather sources → reconcile → write report',
    lines: 12,
    code: `const out = await lab.runChain([
  { name: "Gather", body: \`
    return { findings: [
      { source: "API export", users: 890 },
      { source: "Warehouse",  users: 887 },
    ]};
  \`, capabilities: [] },
  { name: "Reconcile", body: \`
    const avg = Math.round(
      input.findings.reduce((s, f) => s + f.users, 0)
      / input.findings.length
    );
    return { activeUsers: avg, confidence: "high",
             sources: input.findings.length };
  \`, capabilities: [] },
  { name: "Report", body: \`
    return {
      summary: input.activeUsers + " active users (avg of "
               + input.sources + " sources, " + input.confidence + " confidence)",
      resultUrl: "Open the saved result to verify the data pipeline.",
    };
  \`, capabilities: [] },
]);
// → saved result shows every source, the reconciliation math, the final report.`,
  },
  {
    id: 'pr-review',
    tab: 'PR Review Bot',
    knownFrom: 'CodeRabbit, Ralph',
    whatItDoes: 'Pull diff → review → post comment',
    lines: 10,
    code: `const out = await lab.runChain([
  { name: "Pull diff", body: \`
    return { files: [
      { filename: "src/auth.ts", additions: 245, deletions: 12 },
      { filename: "src/utils.ts", additions: 8, deletions: 3 },
      { filename: "README.md", additions: 15, deletions: 2 },
    ] };
  \`, capabilities: [] },
  { name: "Analyze", body: \`
    const issues = input.files.map(f => ({
      file: f.filename,
      additions: f.additions,
      flag: f.additions > 200 ? "large-change" : "ok",
    }));
    return { issues, flagged: issues.filter(i => i.flag !== "ok").length };
  \`, capabilities: [] },
  { name: "Comment", body: \`
    if (input.flagged === 0) return { action: "approve", comment: "LGTM" };
    const body = input.issues.filter(i => i.flag !== "ok")
      .map(i => "- " + i.file + ": " + i.additions + " additions")
      .join("\\n");
    return { action: "would-comment", flagged: input.flagged,
             body: "## Review\\n" + body };
  \`, capabilities: [] },
]);
// → saved result shows the diff, the analysis, and the drafted comment.`,
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Runnable chain steps for homepage demo — one per tab.
// Code Mode runs as-is. Deep Research and PR Review use cached/mock data
// so they work without external APIs or auth.
// ═══════════════════════════════════════════════════════════════════════════

export const RUNNABLE_STEPS: Record<string, { name: string; body: string; capabilities: string[] }[]> = {
  'code-mode': [
    {
      name: 'Write',
      body: `function parseAmount(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^\\d.\\-]/g, ""));
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}
return { fn: parseAmount.toString() };`,
      capabilities: [],
    },
    {
      name: 'Test',
      body: `\${input.fn}
const cases = [
  { in: "$1,234.56", expect: 1234.56 },
  { in: "free",      expect: null },
  { in: null,        expect: null },
];
return cases.map(c => ({
  ...c, actual: parseAmount(c.in),
  pass: parseAmount(c.in) === c.expect,
}));`,
      capabilities: [],
    },
    {
      name: 'Verdict',
      body: `const passed = input.filter(r => r.pass).length;
return { score: passed + "/" + input.length,
         verdict: passed === input.length ? "PASS" : "FAIL" };`,
      capabilities: [],
    },
  ],
  'deep-research': [
    {
      name: 'Gather',
      body: `return { findings: [
  { source: "API",      users: 1200, active: 890 },
  { source: "Internal", users: 1198, active: 887 },
]};`,
      capabilities: [],
    },
    {
      name: 'Reconcile',
      body: `const avg = Math.round(
  input.findings.reduce((s, f) => s + f.active, 0)
  / input.findings.length
);
return { activeUsers: avg, confidence: "high",
         sources: input.findings.length };`,
      capabilities: [],
    },
    {
      name: 'Report',
      body: `return {
  summary: input.activeUsers + " active users (avg of "
           + input.sources + " sources, " + input.confidence + " confidence)",
};`,
      capabilities: [],
    },
  ],
  'pr-review': [
    {
      name: 'Pull diff',
      body: `return { files: [
  { filename: "src/auth.ts", additions: 245, deletions: 12 },
  { filename: "src/utils.ts", additions: 8, deletions: 3 },
  { filename: "README.md", additions: 15, deletions: 2 },
]};`,
      capabilities: [],
    },
    {
      name: 'Analyze',
      body: `const issues = input.files.map(f => ({
  file: f.filename,
  additions: f.additions,
  flag: f.additions > 200 ? "large-change" : "ok",
}));
return { issues, flagged: issues.filter(i => i.flag !== "ok").length };`,
      capabilities: [],
    },
    {
      name: 'Comment',
      body: `if (input.flagged === 0) return { action: "approve", comment: "LGTM" };
const body = input.issues.filter(i => i.flag !== "ok")
  .map(i => "- " + i.file + ": " + i.additions + " additions")
  .join("\\n");
return { action: "would-comment", flagged: input.flagged, body: "## Review\\n" + body };`,
      capabilities: [],
    },
  ],
};

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
