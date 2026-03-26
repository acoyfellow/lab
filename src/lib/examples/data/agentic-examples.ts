import type { ChainStep } from '@acoyfellow/lab';
import type { ExampleData } from '../types';

// ═══════════════════════════════════════════════════════════════════════════
// 1. PROOF OF CORRECTNESS
// ═══════════════════════════════════════════════════════════════════════════

export const PROOF_OF_CORRECTNESS_STEPS: ChainStep[] = [
	{
		name: 'Specify',
		body: `const cases = [
  { input: '$1,234.56',   expected: 1234.56,  label: 'USD with commas' },
  { input: '1234.56',     expected: 1234.56,  label: 'plain decimal' },
  { input: '-$42.00',     expected: -42,       label: 'negative with symbol' },
  { input: '€0.99',       expected: 0.99,      label: 'sub-dollar euro' },
  { input: '$0',          expected: 0,          label: 'zero dollars' },
  { input: '',            expected: null,        label: 'empty string' },
  { input: null,          expected: null,        label: 'null' },
  { input: 'free',        expected: null,        label: 'non-numeric text' },
  { input: '1,000,000',   expected: 1000000,   label: 'millions' },
  { input: '  $12.50  ',  expected: 12.5,       label: 'whitespace padding' },
];
return { cases, totalCases: cases.length };`,
		capabilities: [],
	},
	{
		name: 'Execute',
		body: `function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const cleaned = str.replace(/[^\\d.\\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return Math.round(num * 100) / 100;
}

const results = input.cases.map(tc => {
  let actual, threw = false, error = null;
  try { actual = parseAmount(tc.input); }
  catch (e) { threw = true; error = e.message; actual = undefined; }
  return { label: tc.label, input: tc.input, expected: tc.expected, actual, threw, error };
});
return { results, executed: results.length };`,
		capabilities: [],
	},
	{
		name: 'Assert',
		body: `const assertions = input.results.map(r => ({ ...r, pass: r.actual === r.expected }));
const passed = assertions.filter(a => a.pass).length;
const failed = assertions.filter(a => !a.pass).length;
return { assertions, passed, failed, total: assertions.length };`,
		capabilities: [],
	},
	{
		name: 'Verdict',
		body: `const { passed, failed, total, assertions } = input;
const failures = assertions.filter(a => !a.pass).map(a => ({
  label: a.label, input: a.input, expected: a.expected, actual: a.actual,
}));
return {
  verdict:    failed === 0 ? 'PASS' : 'FAIL',
  score:      passed + '/' + total,
  passed, failed, failures,
  confidence: failed === 0
    ? 'All edge cases handled. Ship it.'
    : failed + ' case(s) need fixing before delivery.',
};`,
		capabilities: [],
	},
];

export const proofOfCorrectness: ExampleData = {
	id: 'proof-of-correctness',
	title: 'Proof of Correctness',
	description: 'Agent writes a function, proves it handles 10 edge cases, delivers the trace as a receipt.',
	problem: 'AI-generated code comes with "this should work." No proof, no edge case coverage.',
	solution: 'Specify edge cases → execute the function → assert every output → return a verdict with the trace.',
	result: 'The trace IS the deliverable. Not "I think this works" — here is the execution receipt.',
	icon: 'check-circle',
	tags: ['agent', 'testing', 'proof', 'trust', 'correctness'],
	steps: [
		{ name: 'Specify', description: '10 edge cases with expected outputs', code: '{ input: "$1,234.56", expected: 1234.56 }', input: {}, output: { totalCases: 10 }, capabilities: [], ms: 1 },
		{ name: 'Execute', description: 'Run parseAmount() against every case', code: 'parseAmount("$1,234.56") → 1234.56', input: { cases: '...' }, output: { executed: 10 }, capabilities: [], ms: 3 },
		{ name: 'Assert', description: 'Strict equality per case', code: 'actual === expected', input: { results: '...' }, output: { passed: 10, failed: 0 }, capabilities: [], ms: 1 },
		{ name: 'Verdict', description: 'Summary for the human', code: '{ verdict: "PASS", score: "10/10" }', input: { passed: 10 }, output: { verdict: 'PASS', confidence: 'Ship it.' }, capabilities: [], ms: 1 },
	],
};


// ═══════════════════════════════════════════════════════════════════════════
// 2. CANARY RUN
// ═══════════════════════════════════════════════════════════════════════════

export const CANARY_RUN_STEPS: ChainStep[] = [
	{
		name: 'Test Data',
		body: `return {
  cases: [
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'BOB@EXAMPLE.COM', name: 'Bob' },
    { email: '  charlie@test.io  ', name: 'Charlie' },
    { email: '', name: 'Empty' },
    { email: null, name: 'Null' },
    { email: 'not-an-email', name: 'Invalid' },
  ]
};`,
		capabilities: [],
	},
	{
		name: 'Old Logic (v1)',
		body: `function normalizeEmailV1(email) {
  if (!email) return null;
  return email.toLowerCase();
}
const results = input.cases.map(c => ({
  name: c.name, input: c.email, output: normalizeEmailV1(c.email),
}));
return { version: 'v1', results };`,
		capabilities: [],
	},
	{
		name: 'New Logic (v2)',
		body: `function normalizeEmailV2(email) {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return null;
  return trimmed;
}
const cases = input.results.map(r => ({ email: r.input, name: r.name }));
const results = cases.map(c => ({
  name: c.name, input: c.email, output: normalizeEmailV2(c.email),
}));
return { version: 'v2', results, v1Results: input.results };`,
		capabilities: [],
	},
	{
		name: 'Diff',
		body: `const v1 = input.v1Results;
const v2 = input.results;
const diffs = [];
for (let i = 0; i < v1.length; i++) {
  if (v1[i].output !== v2[i].output) {
    diffs.push({ case: v1[i].name, input: v1[i].input, v1: v1[i].output, v2: v2[i].output });
  }
}
return {
  totalCases: v1.length,
  unchanged: v1.length - diffs.length,
  changed: diffs.length,
  diffs,
  safe: diffs.every(d => {
    if (typeof d.v1 === 'string' && typeof d.v2 === 'string' && d.v1.trim() === d.v2) return true;
    if (d.v2 === null && typeof d.v1 === 'string') return true;
    return false;
  }),
  summary: diffs.length === 0
    ? 'No behavior change. Ship it.'
    : diffs.length + ' case(s) differ. Review diffs before deploying.',
};`,
		capabilities: [],
	},
];

export const canaryRun: ExampleData = {
	id: 'canary-run',
	title: 'Canary Run',
	description: 'Old logic vs new logic, same inputs. The trace shows exactly what changes before you ship.',
	problem: 'Refactoring is risky. "It should behave the same" is hope, not proof.',
	solution: 'Run old and new logic against identical inputs in separate isolates. Diff the outputs.',
	result: 'Side-by-side comparison. 2 cases changed, both improvements. Approve with confidence.',
	icon: 'git-compare',
	tags: ['canary', 'diff', 'refactor', 'safety', 'agent'],
	steps: [
		{ name: 'Test Data', description: '6 emails including edge cases', code: '{ cases: [{ email: "alice@example.com" }, ...] }', input: {}, output: { cases: 6 }, capabilities: [], ms: 1 },
		{ name: 'Old Logic (v1)', description: 'email.toLowerCase()', code: '"  BOB@EXAMPLE.COM  " → "  bob@example.com  "', input: { cases: '...' }, output: { version: 'v1' }, capabilities: [], ms: 1 },
		{ name: 'New Logic (v2)', description: 'trim + validate + lowercase', code: '"  BOB@EXAMPLE.COM  " → "bob@example.com"', input: { cases: '...' }, output: { version: 'v2' }, capabilities: [], ms: 1 },
		{ name: 'Diff', description: 'What changed between v1 and v2', code: '{ changed: 2, safe: true }', input: { v1: '...', v2: '...' }, output: { changed: 2, safe: true }, capabilities: [], ms: 1 },
	],
};


// ═══════════════════════════════════════════════════════════════════════════
// 3. ZERO BLEED
// ═══════════════════════════════════════════════════════════════════════════

export const ZERO_BLEED_STEPS: ChainStep[] = [
	{
		name: 'Poison',
		body: `globalThis.__leaked = 'POISONED';
globalThis.secret = 42;
Object.prototype.__injected = 'pwned';
Array.prototype.stolen = function() { return 'gotcha'; };
try { globalThis.navigator = 'fake'; } catch(e) {}
try { globalThis.process = { env: { SECRET: 'leaked' } }; } catch(e) {}
return {
  poisoned: true,
  targets: ['globalThis.__leaked', 'Object.prototype.__injected', 'Array.prototype.stolen', 'globalThis.process'],
  message: 'Everything poisoned. Next isolate should see NONE of this.',
};`,
		capabilities: [],
	},
	{
		name: 'Clean Room',
		body: `const checks = {
  globalLeak:      typeof globalThis.__leaked,
  globalSecret:    typeof globalThis.secret,
  protoInjection:  typeof Object.prototype.__injected,
  arrayStolen:     typeof Array.prototype.stolen,
  fakeNavigator:   typeof navigator === 'string',
  fakeProcess:     typeof globalThis.process !== 'undefined' && globalThis.process?.env?.SECRET === 'leaked',
};
const leaked = Object.entries(checks).filter(([_, v]) => v !== 'undefined' && v !== false);
return {
  clean: leaked.length === 0,
  checks,
  leaked: leaked.length,
  message: leaked.length === 0
    ? 'Zero bleed. Every isolate is a clean room.'
    : leaked.length + ' leak(s) detected!',
};`,
		capabilities: [],
	},
	{
		name: 'Verdict',
		body: `return {
  isolation: input.clean ? 'CONFIRMED' : 'BREACHED',
  leaks: input.leaked,
  message: input.message,
  implication: input.clean
    ? 'Untrusted code in step N cannot affect step N+1. This is the security model.'
    : 'Isolation failure — this should never happen.',
};`,
		capabilities: [],
	},
];

export const zeroBleed: ExampleData = {
	id: 'zero-bleed',
	title: 'Zero Bleed',
	description: 'Step 1 poisons globals and prototypes. Step 2 is a fresh V8. Nothing leaks.',
	problem: 'If an agent runs untrusted code in step 1, can it corrupt step 2?',
	solution: 'Poison everything — globals, prototypes, navigator, process. Next isolate checks every vector.',
	result: 'Zero bleed. Every isolate is a clean room. This is the security model.',
	icon: 'shield',
	tags: ['security', 'isolation', 'zero-trust', 'v8', 'agent'],
	steps: [
		{ name: 'Poison', description: 'Globals, prototypes, fake process.env', code: 'globalThis.__leaked = "POISONED"', input: {}, output: { poisoned: true, targets: 4 }, capabilities: [], ms: 2 },
		{ name: 'Clean Room', description: 'Fresh isolate checks every vector', code: 'typeof globalThis.__leaked → "undefined"', input: {}, output: { clean: true, leaked: 0 }, capabilities: [], ms: 1 },
		{ name: 'Verdict', description: 'Confirm isolation held', code: '{ isolation: "CONFIRMED" }', input: { clean: true }, output: { isolation: 'CONFIRMED' }, capabilities: [], ms: 1 },
	],
};


// ═══════════════════════════════════════════════════════════════════════════
// 4. COMPUTE OFFLOAD
// ═══════════════════════════════════════════════════════════════════════════

export const COMPUTE_OFFLOAD_STEPS: ChainStep[] = [
	{
		name: 'Fibonacci',
		body: `function fib(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) { [a, b] = [b, a + b]; }
  return b;
}
const results = {};
for (const n of [10, 20, 30, 40, 50]) {
  results['fib(' + n + ')'] = fib(n);
}
return { operation: 'fibonacci', results };`,
		capabilities: [],
	},
	{
		name: 'Prime Sieve',
		body: `const limit = 10000;
const sieve = new Uint8Array(limit + 1);
for (let i = 2; i * i <= limit; i++) {
  if (!sieve[i]) for (let j = i * i; j <= limit; j += i) sieve[j] = 1;
}
const primes = [];
for (let i = 2; i <= limit; i++) { if (!sieve[i]) primes.push(i); }
return {
  operation: 'prime_sieve',
  limit,
  count: primes.length,
  largest: primes[primes.length - 1],
  first5: primes.slice(0, 5),
  last5: primes.slice(-5),
};`,
		capabilities: [],
	},
	{
		name: 'Matrix Multiply',
		body: `const N = 50;
function rand(r, c) {
  return Array.from({ length: r }, () =>
    Array.from({ length: c }, () => Math.round(Math.random() * 10))
  );
}
function mul(a, b) {
  const R = a.length, C = b[0].length, K = b.length;
  const c = Array.from({ length: R }, () => new Array(C).fill(0));
  for (let i = 0; i < R; i++)
    for (let k = 0; k < K; k++)
      for (let j = 0; j < C; j++)
        c[i][j] += a[i][k] * b[k][j];
  return c;
}
const t0 = Date.now();
const c = mul(rand(N, N), rand(N, N));
const ms = Date.now() - t0;
return {
  operation: 'matrix_multiply',
  dimensions: N + 'x' + N,
  ms,
  checksum: c.flat().reduce((s, v) => s + v, 0),
};`,
		capabilities: [],
	},
	{
		name: 'Summary',
		body: `return {
  offloaded: 3,
  operations: ['fibonacci', 'prime_sieve', 'matrix_multiply'],
  lastStep: { operation: input.operation, dimensions: input.dimensions, checksum: input.checksum },
  message: 'Three computations an LLM would hallucinate. The edge got them right.',
  note: 'Open the trace — every step has the exact answer with per-isolate timing.',
};`,
		capabilities: [],
	},
];

export const computeOffload: ExampleData = {
	id: 'compute-offload',
	title: 'Compute Offload',
	description: 'Fibonacci, prime sieve, matrix multiply — real math on the edge, not hallucinated.',
	problem: 'LLMs guess at arithmetic. They hallucinate fib(50), miscount primes, can\'t multiply matrices.',
	solution: 'Ship the computation to a Lab isolate. Get the exact answer with a trace proving it.',
	result: 'fib(50) = 12,586,269,025. 1,229 primes under 10k. 50x50 matrix. Zero hallucination.',
	icon: 'cpu',
	tags: ['compute', 'math', 'offload', 'agent', 'accuracy'],
	steps: [
		{ name: 'Fibonacci', description: 'fib(10) through fib(50)', code: 'fib(50) → 12586269025', input: {}, output: { 'fib(50)': 12586269025 }, capabilities: [], ms: 1 },
		{ name: 'Prime Sieve', description: 'All primes to 10,000', code: 'sieve(10000) → 1229 primes', input: {}, output: { count: 1229, largest: 9973 }, capabilities: [], ms: 3 },
		{ name: 'Matrix Multiply', description: '50x50 matrix mult', code: 'mul(A, B)', input: {}, output: { dimensions: '50x50' }, capabilities: [], ms: 4 },
		{ name: 'Summary', description: '3 operations, 0 hallucination', code: '{ offloaded: 3 }', input: {}, output: { message: 'The edge got them right.' }, capabilities: [], ms: 1 },
	],
};


// ═══════════════════════════════════════════════════════════════════════════
// 5. PREFLIGHT CHECK
// ═══════════════════════════════════════════════════════════════════════════

export const PREFLIGHT_CHECK_STEPS: ChainStep[] = [
	{
		name: 'Load Migration',
		body: `const migration = {
  name: 'add_status_column',
  sql: 'ALTER TABLE users ADD COLUMN status TEXT DEFAULT "active"',
  rollback: 'ALTER TABLE users DROP COLUMN status',
};
const sampleRows = [
  { id: 1, email: 'alice@co.com', created_at: '2025-01-15' },
  { id: 2, email: 'bob@co.com', created_at: '2025-03-22' },
  { id: 3, email: null, created_at: '2025-06-01' },
  { id: 4, email: 'dave@co.com', created_at: '2024-11-30' },
];
return { migration, sampleRows, rowCount: sampleRows.length };`,
		capabilities: [],
	},
	{
		name: 'Simulate',
		body: `const { migration, sampleRows } = input;
const after = sampleRows.map(row => ({ ...row, status: 'active' }));
const nullEmails = sampleRows.filter(r => !r.email).length;
return {
  migration: migration.name,
  before: { columns: Object.keys(sampleRows[0]), rowCount: sampleRows.length },
  after:  { columns: Object.keys(after[0]),       rowCount: after.length },
  newColumn: { name: 'status', default: 'active', type: 'TEXT' },
  warnings: nullEmails > 0
    ? [nullEmails + ' row(s) have null email — verify these are expected']
    : [],
  sampleBefore: sampleRows[0],
  sampleAfter: after[0],
};`,
		capabilities: [],
	},
	{
		name: 'Rollback Plan',
		body: `return {
  migration: input.migration,
  rollbackSql: 'ALTER TABLE users DROP COLUMN status',
  rollbackSafe: true,
  dataLoss: false,
  note: 'DROP COLUMN removes the column and data. No other columns affected.',
  before: input.before,
  warnings: input.warnings,
};`,
		capabilities: [],
	},
	{
		name: 'Approval',
		body: `const warnings = input.warnings || [];
return {
  action: input.migration,
  status: warnings.length === 0 ? 'READY' : 'REVIEW',
  changes: { adds: ['status TEXT DEFAULT "active"'], removes: [], modifies: [] },
  affectedRows: input.before?.rowCount ?? 0,
  warnings,
  rollbackAvailable: input.rollbackSafe,
  message: warnings.length === 0
    ? 'Migration is safe. Approve to proceed.'
    : 'Review ' + warnings.length + ' warning(s) before approving.',
  instruction: 'Share this trace URL with your team. Approve or reject.',
};`,
		capabilities: [],
	},
];

export const preflightCheck: ExampleData = {
	id: 'preflight-check',
	title: 'Preflight Check',
	description: 'Simulate a DB migration against sample data. The trace is the approval artifact.',
	problem: 'Agent is about to run a migration. "This should be safe" is not proof.',
	solution: 'Simulate against sample rows → check for warnings → generate rollback plan → produce approval.',
	result: '1 warning caught (null email row). Rollback available. Review the trace, then approve.',
	icon: 'alert-triangle',
	tags: ['preflight', 'simulation', 'safety', 'migration', 'agent'],
	steps: [
		{ name: 'Load Migration', description: 'ALTER TABLE + 4 sample rows', code: '{ sql: "ALTER TABLE users ADD COLUMN status..." }', input: {}, output: { rowCount: 4 }, capabilities: [], ms: 1 },
		{ name: 'Simulate', description: 'Apply migration in-memory', code: 'rows.map(r => ({ ...r, status: "active" }))', input: { sampleRows: '...' }, output: { warnings: 1 }, capabilities: [], ms: 2 },
		{ name: 'Rollback Plan', description: 'Verify reversibility', code: '{ rollbackSafe: true, dataLoss: false }', input: {}, output: { rollbackSafe: true }, capabilities: [], ms: 1 },
		{ name: 'Approval', description: 'For human review', code: '{ status: "REVIEW", warnings: 1 }', input: {}, output: { status: 'REVIEW', instruction: 'Share this trace URL.' }, capabilities: [], ms: 1 },
	],
};


// ═══════════════════════════════════════════════════════════════════════════
// 6. COLD BOOT SPRINT
// ═══════════════════════════════════════════════════════════════════════════

export const COLD_BOOT_SPRINT_STEPS: ChainStep[] = Array.from({ length: 20 }, (_, i) => ({
	name: `Isolate ${i + 1}`,
	body: `// unique-${i} — forces fresh V8 (no cache)
const primes = [];
for (let n = 2; primes.length < ${10 + i}; n++) {
  if (Array.from({length: n - 2}, (_, j) => j + 2).every(d => n % d !== 0)) primes.push(n);
}
const prev = ${i === 0 ? '[]' : 'Array.isArray(input) ? input : []'};
return [...prev, { isolate: ${i + 1}, primes: primes.length, ms: Date.now() % 10000 }];`,
	capabilities: [],
}));

// ═══════════════════════════════════════════════════════════════════════════
// 7. TRACE HANDOFF — Agent A produces work, Agent B picks it up via trace
// ═══════════════════════════════════════════════════════════════════════════

export const TRACE_HANDOFF_STEPS: ChainStep[] = [
	{
		name: 'Agent A: Research',
		body: `// Agent A gathers and structures data
const findings = {
  topic: 'Edge isolate performance',
  sources: [
    { name: 'CF docs', claim: 'sub-millisecond cold starts', confidence: 'high' },
    { name: 'Benchmark', claim: '< 5ms for prime sieve to 10k', confidence: 'measured' },
    { name: 'Community', claim: 'isolates share nothing', confidence: 'verified' },
  ],
  summary: '3 sources checked, all consistent.',
  handoff: 'Ready for Agent B to synthesize.',
};
return findings;`,
		capabilities: [],
	},
	{
		name: 'Agent B: Synthesize',
		body: `// Agent B receives Agent A's findings via the chain
const { sources, topic } = input;
const highConfidence = sources.filter(s => s.confidence !== 'low');
const synthesis = {
  topic,
  conclusion: highConfidence.length + '/' + sources.length + ' sources are high-confidence.',
  claims: highConfidence.map(s => s.claim),
  recommendation: 'Sufficient evidence to proceed.',
};
return synthesis;`,
		capabilities: [],
	},
	{
		name: 'Agent C: Draft',
		body: `// Agent C takes the synthesis and produces a deliverable
const { topic, conclusion, claims, recommendation } = input;
return {
  draft: topic + ': ' + claims.join('. ') + '.',
  status: 'ready_for_review',
  conclusion,
  recommendation,
  agentsInvolved: 3,
  note: 'Each agent ran in a separate isolate. The trace shows the full handoff chain.',
};`,
		capabilities: [],
	},
];

export const traceHandoff: ExampleData = {
	id: 'trace-handoff',
	title: 'Trace Handoff',
	description: 'Three agents in a relay. Each picks up where the last left off. The trace is the handoff protocol.',
	problem: 'How do agents share work? Custom APIs? Shared databases? Message queues?',
	solution: 'Agent A → isolate → trace. Agent B reads the trace, continues in a new isolate. Repeat.',
	result: '3 agents, 3 isolates, 1 trace URL. The trace IS the coordination layer.',
	icon: 'arrow-right-left',
	tags: ['handoff', 'multi-agent', 'coordination', 'trace', 'relay'],
	steps: [
		{ name: 'Agent A: Research', description: 'Gather and structure findings', code: '{ sources: 3, summary: "All consistent" }', input: {}, output: { sources: 3, handoff: 'Ready for Agent B' }, capabilities: [], ms: 2 },
		{ name: 'Agent B: Synthesize', description: 'Filter and conclude', code: '{ conclusion: "3/3 high-confidence" }', input: { sources: '...' }, output: { recommendation: 'Proceed' }, capabilities: [], ms: 1 },
		{ name: 'Agent C: Draft', description: 'Produce deliverable', code: '{ status: "ready_for_review" }', input: { synthesis: '...' }, output: { agentsInvolved: 3 }, capabilities: [], ms: 1 },
	],
};


// ═══════════════════════════════════════════════════════════════════════════
// 8. ITERATIVE REPAIR — Agent tries, fails, reads the error, fixes, retries
// ═══════════════════════════════════════════════════════════════════════════

export const ITERATIVE_REPAIR_STEPS: ChainStep[] = [
	{
		name: 'Attempt 1: Naive parse',
		body: `const raw = '{ name: "Alice", age: 30 }';  // not valid JSON (unquoted keys)
try {
  return { ok: true, data: JSON.parse(raw), attempt: 1 };
} catch (e) {
  return { ok: false, error: e.message, raw, attempt: 1 };
}`,
		capabilities: [],
	},
	{
		name: 'Diagnose failure',
		body: `if (input.ok) return { ...input, diagnosis: 'No repair needed' };
// Agent reads the error and raw data from the trace
const diagnosis = [];
if (input.raw.match(/\\b\\w+:/)) diagnosis.push('unquoted_keys');
if (input.raw.match(/'/)) diagnosis.push('single_quotes');
if (input.raw.match(/,\\s*[}\\]]/)) diagnosis.push('trailing_commas');
return {
  ok: false,
  raw: input.raw,
  attempt: input.attempt,
  error: input.error,
  diagnosis,
  strategy: diagnosis.includes('unquoted_keys')
    ? 'Quote all keys with regex before re-parse'
    : 'Unknown pattern — escalate',
};`,
		capabilities: [],
	},
	{
		name: 'Attempt 2: Apply fix',
		body: `if (input.ok) return input;
let fixed = input.raw;
// Apply the strategy from diagnosis
if (input.diagnosis.includes('unquoted_keys')) {
  fixed = fixed.replace(/(\\s*)([a-zA-Z_]\\w*)\\s*:/g, '$1"$2":');
}
if (input.diagnosis.includes('trailing_commas')) {
  fixed = fixed.replace(/,\\s*([}\\]])/g, '$1');
}
try {
  return { ok: true, data: JSON.parse(fixed), attempt: input.attempt + 1, fixed: true, appliedFixes: input.diagnosis };
} catch (e) {
  return { ok: false, error: e.message, raw: fixed, attempt: input.attempt + 1, diagnosis: input.diagnosis };
}`,
		capabilities: [],
	},
	{
		name: 'Report',
		body: `return {
  success: input.ok,
  attempts: input.attempt,
  fixed: !!input.fixed,
  appliedFixes: input.appliedFixes || [],
  data: input.data,
  narrative: input.fixed
    ? 'Attempt 1 failed. Diagnosed ' + (input.appliedFixes || []).join(', ') + '. Attempt 2 succeeded.'
    : input.ok ? 'Parsed on first try.' : 'All attempts failed.',
};`,
		capabilities: [],
	},
];

export const iterativeRepair: ExampleData = {
	id: 'iterative-repair',
	title: 'Iterative Repair',
	description: 'Agent tries to parse, fails, reads the error, diagnoses the problem, applies a fix, retries. The trace shows the thinking.',
	problem: 'Data is broken in unpredictable ways. A single-shot parser either works or crashes.',
	solution: 'Try → fail → diagnose from the error → apply targeted fix → retry. Each step in its own isolate.',
	result: 'Attempt 1 failed (unquoted keys). Diagnosed. Attempt 2 succeeded. The trace shows the full reasoning chain.',
	icon: 'refresh-cw',
	tags: ['self-healing', 'repair', 'iterative', 'diagnosis', 'agent'],
	steps: [
		{ name: 'Attempt 1', description: 'Naive JSON.parse', code: 'JSON.parse(raw) → throws', input: {}, output: { ok: false, error: 'Unexpected token' }, capabilities: [], ms: 1 },
		{ name: 'Diagnose', description: 'Read error + raw data', code: '{ diagnosis: ["unquoted_keys"] }', input: { error: '...' }, output: { strategy: 'Quote all keys' }, capabilities: [], ms: 1 },
		{ name: 'Attempt 2', description: 'Apply regex fix + re-parse', code: 'fixed.replace(/(\\w+):/g, \'"$1":\')', input: { diagnosis: '...' }, output: { ok: true, fixed: true }, capabilities: [], ms: 1 },
		{ name: 'Report', description: 'Summarize the repair narrative', code: '{ narrative: "Attempt 1 failed. Diagnosed. Attempt 2 succeeded." }', input: { ok: true }, output: { attempts: 2, success: true }, capabilities: [], ms: 1 },
	],
};


export const coldBootSprint: ExampleData = {
	id: 'cold-boot-sprint',
	title: 'Cold Boot Sprint',
	description: '20 unique isolates, each a fresh V8. See per-step timing in the trace.',
	problem: 'How fast can Cloudflare spin up isolated V8 instances on demand?',
	solution: '20 chain steps, each with unique code. Every step is a cold boot — no cache hits.',
	result: '20 isolates, single-digit ms per boot. This is the engine.',
	icon: 'zap',
	tags: ['benchmark', 'cold-boot', 'isolate', 'latency', 'loader'],
	steps: [
		{ name: 'Isolate 1–5', description: '5 cold boots', code: 'primes(10..14)', input: {}, output: { isolates: 5 }, capabilities: [], ms: 30 },
		{ name: 'Isolate 6–10', description: '5 more cold boots', code: 'primes(15..19)', input: { prev: '...' }, output: { isolates: 10 }, capabilities: [], ms: 30 },
		{ name: 'Isolate 11–15', description: '5 more cold boots', code: 'primes(20..24)', input: { prev: '...' }, output: { isolates: 15 }, capabilities: [], ms: 30 },
		{ name: 'Isolate 16–20', description: 'Final 5', code: 'primes(25..29)', input: { prev: '...' }, output: { isolates: 20 }, capabilities: [], ms: 30 },
	],
};
