/**
 * Homepage code samples — driven by `+page.svelte` (runnable demo) and
 * `+page.server.ts` (Shiki-rendered receipt-shape sample).
 *
 * Also exports `CHAIN_STEPS_FOR_CURL` which is consumed by
 * `src/lib/guest-code-fixtures.ts` for test fixtures.
 */

/** Used by `guest-code-fixtures.ts` — keep stable. */
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

// ═══════════════════════════════════════════════════════════════════════════
// "You've used these before" — recognizable agent patterns mapped to Lab.
// Used by the homepage runnable demo (tabs + chain runs).
// ═══════════════════════════════════════════════════════════════════════════

export const KNOWN_PATTERNS = [
  {
    id: 'code-mode',
    tab: 'Code mode',
    knownFrom: 'Cursor, Claude Code',
    whatItDoes: 'Write a function → run tests → prove it works',
    lines: 25,
    code: `const out = await lab.runChain([
  {
    name: "Spec",
    body: \`
      return {
        cases: [
          { input: "$1,234.56", expected: 1234.56 },
          { input: "free", expected: null },
          { input: null, expected: null },
        ],
      };
    \`,
    capabilities: []
  },
  {
    name: "Implement + test",
    body: \`
      function parseAmount(raw) {
        if (!raw) return null;
        const n = parseFloat(String(raw).replace(/[^\\\\d.\\\\-]/g, ""));
        return Number.isNaN(n) ? null : Math.round(n * 100) / 100;
      }

      return input.cases.map((c) => {
        const actual = parseAmount(c.input);
        return { ...c, actual, pass: actual === c.expected };
      });
    \`,
    capabilities: []
  },
  {
    name: "Verdict",
    body: \`
      const passed = input.filter((r) => r.pass).length;
      return {
        score: passed + "/" + input.length,
        verdict: passed === input.length ? "PASS" : "FAIL",
      };
    \`,
    capabilities: []
  },
]);
// → receipt JSON proves 3/3 pass. Ship the receipt, not "trust me."`,
  },
  {
    id: 'deep-research',
    tab: 'Deep research',
    knownFrom: 'Perplexity, Gemini Deep Research',
    whatItDoes: 'Gather sources → reconcile → write report',
    lines: 25,
    code: `const out = await lab.runChain([
  {
    name: "Gather",
    body: \`
      return {
        findings: [
          { source: "API export", users: 890 },
          { source: "Warehouse", users: 887 },
        ],
      };
    \`,
    capabilities: []
  },
  {
    name: "Reconcile",
    body: \`
      const avg = Math.round(
        input.findings.reduce((s, f) => s + f.users, 0)
        / input.findings.length
      );
      return {
        activeUsers: avg,
        confidence: "high",
        sources: input.findings.length,
      };
    \`,
    capabilities: []
  },
  {
    name: "Report",
    body: \`
      return {
        summary: input.activeUsers + " active users (avg of "
          + input.sources + " sources, " + input.confidence + " confidence)",
        resultUrl: "Open the receipt to verify the data pipeline.",
      };
    \`,
    capabilities: []
  },
]);
// → receipt shows every source, the reconciliation math, the final report.`,
  },
  {
    id: 'pr-review',
    tab: 'PR review',
    knownFrom: 'CodeRabbit, Ralph',
    whatItDoes: 'Pull diff → review → post comment',
    lines: 25,
    code: `const out = await lab.runChain([
  {
    name: "Pull diff",
    body: \`
      return {
        files: [
          { filename: "src/auth.ts", additions: 245, deletions: 12 },
          { filename: "src/utils.ts", additions: 8, deletions: 3 },
          { filename: "README.md", additions: 15, deletions: 2 },
        ],
      };
    \`,
    capabilities: []
  },
  {
    name: "Analyze",
    body: \`
      const issues = input.files.map((f) => ({
        file: f.filename,
        additions: f.additions,
        flag: f.additions > 200 ? "large-change" : "ok",
      }));
      return {
        issues,
        flagged: issues.filter((i) => i.flag !== "ok").length,
      };
    \`,
    capabilities: []
  },
  {
    name: "Comment",
    body: \`
      if (input.flagged === 0) {
        return { action: "approve", comment: "LGTM" };
      }

      const body = input.issues
        .filter((i) => i.flag !== "ok")
        .map((i) => "- " + i.file + ": " + i.additions + " additions")
        .join("\\n");

      return {
        action: "would-comment",
        flagged: input.flagged,
        body: "## Review\\n" + body,
      };
    \`,
    capabilities: []
  },
]);
// → receipt shows the diff, the analysis, and the drafted comment.`,
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// Runnable chain steps for homepage demo — one per tab.
// Code mode runs as-is. Deep research and PR review use cached/mock data
// so they work without external APIs or auth.
// ═══════════════════════════════════════════════════════════════════════════

export const RUNNABLE_STEPS: Record<string, { name: string; body: string; capabilities: string[] }[]> = {
  'code-mode': [
    {
      name: 'Spec',
      body: `return {
  cases: [
    { input: "$1,234.56", expected: 1234.56 },
    { input: "free", expected: null },
    { input: null, expected: null },
  ],
};`,
      capabilities: [],
    },
    {
      name: 'Implement + test',
      body: `function parseAmount(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^\\d.\\-]/g, ""));
  return Number.isNaN(n) ? null : Math.round(n * 100) / 100;
}
return input.cases.map((c) => {
  const actual = parseAmount(c.input);
  return { ...c, actual, pass: actual === c.expected };
});`,
      capabilities: [],
    },
    {
      name: 'Verdict',
      body: `const passed = input.filter((r) => r.pass).length;
return {
  score: passed + "/" + input.length,
  verdict: passed === input.length ? "PASS" : "FAIL",
};`,
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
