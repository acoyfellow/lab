import type { ChainStep } from '@acoyfellow/lab';
import type { ExampleData } from '../types';


// ─────────────────────────────────────────────────────────────────────────
// 1. SORT
// ─────────────────────────────────────────────────────────────────────────

export const SORT_STEPS: ChainStep[] = [
	{
		name: 'Sort 10k',
		body: `const data = Array.from({ length: 10000 }, () => Math.random());
const t0 = Date.now();
const sorted = [...data].sort((a, b) => a - b);
const ms = Date.now() - t0;
return {
  items: data.length,
  ms,
  first5: sorted.slice(0, 5).map(n => +n.toFixed(6)),
  last5: sorted.slice(-5).map(n => +n.toFixed(6)),
  isSorted: sorted.every((v, i) => i === 0 || v >= sorted[i - 1]),
};`,
		capabilities: [],
	},
];

export const sort: ExampleData = {
	id: 'sort',
	title: 'Sort 10k Items',
	description: '10,000 random numbers sorted on the edge. Trace shows wall time.',
	problem: 'How fast is a sort in an isolate?',
	solution: 'Generate → sort → verify. One step.',
	result: '10k items sorted in ~2ms. Trace proves it.',
	icon: 'arrow-up-down',
	tags: ['simple', 'sort', 'benchmark', 'loop'],
	steps: [
		{ name: 'Sort 10k', description: 'Generate, sort, verify', code: '[...data].sort((a, b) => a - b)', input: {}, output: { items: 10000, ms: 2, isSorted: true }, capabilities: [], ms: 3 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 2. DEDUPE
// ─────────────────────────────────────────────────────────────────────────

export const DEDUPE_STEPS: ChainStep[] = [
	{
		name: 'Dedupe',
		body: `const raw = [
  'alice@co.com', 'bob@co.com', 'alice@co.com', 'carol@co.com',
  'bob@co.com', 'dave@co.com', 'alice@co.com', 'eve@co.com',
  'carol@co.com', 'frank@co.com', 'eve@co.com', 'dave@co.com',
];
const unique = [...new Set(raw)];
return {
  before: raw.length,
  after: unique.length,
  removed: raw.length - unique.length,
  unique,
};`,
		capabilities: [],
	},
];

export const dedupe: ExampleData = {
	id: 'dedupe',
	title: 'Dedupe a List',
	description: '12 emails → 6 unique. One line of code, one isolate.',
	problem: 'Remove duplicates from a list without guessing.',
	solution: '[...new Set(raw)]',
	result: '12 → 6. Removed 6 duplicates. Trace has the exact list.',
	icon: 'filter',
	tags: ['simple', 'dedupe', 'set', 'array'],
	steps: [
		{ name: 'Dedupe', description: 'Set removes duplicates', code: '[...new Set(raw)]', input: {}, output: { before: 12, after: 6, removed: 6 }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 3. REGEX TEST
// ─────────────────────────────────────────────────────────────────────────

export const REGEX_TEST_STEPS: ChainStep[] = [
	{
		name: 'Regex Test',
		body: `const pattern = /^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/;
const inputs = [
  'alice@example.com',
  'bob@co',
  'not-an-email',
  'carol@test.io',
  '@missing.com',
  'dave@sub.domain.org',
  '',
  'eve@localhost',
];
const results = inputs.map(s => ({ input: s, match: pattern.test(s) }));
return {
  pattern: pattern.toString(),
  tested: results.length,
  matched: results.filter(r => r.match).length,
  results,
};`,
		capabilities: [],
	},
];

export const regexTest: ExampleData = {
	id: 'regex-test',
	title: 'Regex Test',
	description: 'Test an email regex against 8 inputs. No guessing — run it.',
	problem: '"Does this regex match?" — don\'t reason about it, run it.',
	solution: 'Ship the pattern + inputs to an isolate. Get exact matches.',
	result: '8 inputs tested. 3 matched. Trace has every result.',
	icon: 'search',
	tags: ['simple', 'regex', 'validation', 'eval'],
	steps: [
		{ name: 'Regex Test', description: 'Test pattern against 8 strings', code: '/^[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}$/.test(input)', input: {}, output: { tested: 8, matched: 3 }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 4. DATE MATH
// ─────────────────────────────────────────────────────────────────────────

export const DATE_MATH_STEPS: ChainStep[] = [
	{
		name: 'Date Math',
		body: `const now = new Date();

function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

const in30 = addBusinessDays(now, 30);
const in90 = addBusinessDays(now, 90);
const endOfYear = new Date(now.getFullYear(), 11, 31);

return {
  today: now.toISOString().split('T')[0],
  in30BusinessDays: in30.toISOString().split('T')[0],
  in90BusinessDays: in90.toISOString().split('T')[0],
  calendarDaysToEndOfYear: daysBetween(now, endOfYear),
  dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()],
};`,
		capabilities: [],
	},
];

export const dateMath: ExampleData = {
	id: 'date-math',
	title: 'Date Math',
	description: 'Business days, calendar math, day-of-week — computed, not guessed.',
	problem: 'LLMs are bad at date arithmetic. "90 business days from today" — don\'t guess.',
	solution: 'Run the date calculation in an isolate. Get the exact answer.',
	result: 'Exact dates. No off-by-one. Trace proves it.',
	icon: 'calendar',
	tags: ['simple', 'dates', 'math', 'eval'],
	steps: [
		{ name: 'Date Math', description: 'Business days + calendar math', code: 'addBusinessDays(today, 90)', input: {}, output: { in90BusinessDays: '2026-08-03' }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 5. HASH
// ─────────────────────────────────────────────────────────────────────────

export const HASH_STEPS: ChainStep[] = [
	{
		name: 'SHA-256',
		body: `const text = 'hello from lab';
const encoder = new TextEncoder();
const data = encoder.encode(text);
const hash = await crypto.subtle.digest('SHA-256', data);
const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
return { input: text, algorithm: 'SHA-256', hash: hex, length: hex.length };`,
		capabilities: [],
	},
];

export const hash: ExampleData = {
	id: 'hash',
	title: 'SHA-256 Hash',
	description: 'Hash a string with crypto.subtle. Exact hex output. One step.',
	problem: 'Need a hash? Don\'t install a library — run it on the edge.',
	solution: 'crypto.subtle.digest in an isolate. Done.',
	result: 'Deterministic SHA-256 hex. 64 characters. Trace has it.',
	icon: 'hash',
	tags: ['simple', 'crypto', 'hash', 'eval'],
	steps: [
		{ name: 'SHA-256', description: 'Hash a string', code: 'crypto.subtle.digest("SHA-256", data)', input: {}, output: { algorithm: 'SHA-256', length: 64 }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 6. VALIDATE JSON
// ─────────────────────────────────────────────────────────────────────────

export const VALIDATE_JSON_STEPS: ChainStep[] = [
	{
		name: 'Validate',
		body: `const samples = [
  '{"name": "Alice", "age": 30}',
  '{"broken": true,}',
  '[1, 2, 3]',
  '{name: "no quotes"}',
  '',
  'null',
  '{"nested": {"deep": {"value": 42}}}',
];
const results = samples.map(s => {
  try {
    const parsed = JSON.parse(s);
    return { input: s.slice(0, 40), valid: true, type: Array.isArray(parsed) ? 'array' : typeof parsed };
  } catch (e) {
    return { input: s.slice(0, 40), valid: false, error: e.message };
  }
});
return {
  tested: results.length,
  valid: results.filter(r => r.valid).length,
  invalid: results.filter(r => !r.valid).length,
  results,
};`,
		capabilities: [],
	},
];

export const validateJson: ExampleData = {
	id: 'validate-json',
	title: 'Validate JSON',
	description: '7 strings — which are valid JSON? Don\'t eyeball it. Run it.',
	problem: '"Is this valid JSON?" — parsing errors are exact, guesses are not.',
	solution: 'JSON.parse each string. Catch tells you exactly what\'s wrong.',
	result: '4 valid, 3 invalid. Trace shows the exact parse errors.',
	icon: 'file-json',
	tags: ['simple', 'json', 'validation', 'eval'],
	steps: [
		{ name: 'Validate', description: 'JSON.parse 7 strings', code: 'JSON.parse(s) // catch → error.message', input: {}, output: { tested: 7, valid: 4, invalid: 3 }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 7. WORD FREQUENCY
// ─────────────────────────────────────────────────────────────────────────

export const WORD_FREQUENCY_STEPS: ChainStep[] = [
	{
		name: 'Count',
		body: `const text = "the quick brown fox jumps over the lazy dog the fox the dog the quick fox";
const words = text.toLowerCase().split(/\\s+/).filter(Boolean);
const freq = {};
for (const w of words) freq[w] = (freq[w] || 0) + 1;
const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
return {
  totalWords: words.length,
  uniqueWords: sorted.length,
  top5: sorted.slice(0, 5).map(([word, count]) => ({ word, count })),
  full: Object.fromEntries(sorted),
};`,
		capabilities: [],
	},
];

export const wordFrequency: ExampleData = {
	id: 'word-frequency',
	title: 'Word Frequency',
	description: 'Count every word in a text. Sorted by frequency. One step.',
	problem: 'Word counts, frequency analysis — tedious to do by hand, easy to miscount.',
	solution: 'Split, count, sort. Isolate does it in <1ms.',
	result: '"the" appears 5 times. 16 words, 8 unique. Trace has the full frequency map.',
	icon: 'text',
	tags: ['simple', 'text', 'frequency', 'loop'],
	steps: [
		{ name: 'Count', description: 'Split → count → sort', code: 'freq[w] = (freq[w] || 0) + 1', input: {}, output: { totalWords: 16, uniqueWords: 8 }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 8. MAP / FILTER / REDUCE
//    The loop offload. Process an array, get timing, prove the output.
// ─────────────────────────────────────────────────────────────────────────

export const MAP_FILTER_REDUCE_STEPS: ChainStep[] = [
	{
		name: 'Generate',
		body: `const users = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: 'user_' + (i + 1),
  age: 18 + (i % 50),
  active: i % 3 !== 0,
  spent: Math.round(Math.random() * 500 * 100) / 100,
}));
return { users, count: users.length };`,
		capabilities: [],
	},
	{
		name: 'Map → Filter → Reduce',
		body: `const t0 = Date.now();

const active = input.users.filter(u => u.active);
const emails = active.map(u => u.name + '@example.com');
const totalSpent = active.reduce((sum, u) => sum + u.spent, 0);
const avgSpent = Math.round((totalSpent / active.length) * 100) / 100;
const oldest = active.reduce((max, u) => u.age > max.age ? u : max);
const youngest = active.reduce((min, u) => u.age < min.age ? u : min);

const ms = Date.now() - t0;
return {
  input: input.count,
  activeUsers: active.length,
  filteredOut: input.count - active.length,
  totalSpent: Math.round(totalSpent * 100) / 100,
  avgSpent,
  oldest: { name: oldest.name, age: oldest.age },
  youngest: { name: youngest.name, age: youngest.age },
  sampleEmails: emails.slice(0, 3),
  ms,
};`,
		capabilities: [],
	},
];

export const mapFilterReduce: ExampleData = {
	id: 'map-filter-reduce',
	title: 'Map → Filter → Reduce',
	description: '1,000 users. Filter active. Map emails. Reduce totals. Trace shows timing.',
	problem: 'Every app processes arrays. Agents can offload the loop and prove the output.',
	solution: 'Generate 1k users → filter → map → reduce. Two steps. Trace has the numbers.',
	result: '667 active users, total spend, averages, oldest/youngest. All verified.',
	icon: 'repeat',
	tags: ['simple', 'loop', 'map', 'filter', 'reduce', 'array'],
	steps: [
		{ name: 'Generate', description: '1,000 user objects', code: 'Array.from({ length: 1000 }, ...)', input: {}, output: { count: 1000 }, capabilities: [], ms: 2 },
		{ name: 'Map → Filter → Reduce', description: 'Filter active, map emails, reduce spend', code: 'users.filter().map().reduce()', input: { count: 1000 }, output: { activeUsers: 667, avgSpent: 248.50 }, capabilities: [], ms: 2 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 9. GENERATE UUIDs
// ─────────────────────────────────────────────────────────────────────────

export const GENERATE_UUIDS_STEPS: ChainStep[] = [
	{
		name: 'Generate 100',
		body: `const t0 = Date.now();
const uuids = Array.from({ length: 100 }, () => crypto.randomUUID());
const ms = Date.now() - t0;
const unique = new Set(uuids).size;
return {
  generated: uuids.length,
  unique,
  allUnique: unique === uuids.length,
  ms,
  sample: uuids.slice(0, 5),
};`,
		capabilities: [],
	},
];

export const generateUuids: ExampleData = {
	id: 'generate-uuids',
	title: 'Generate 100 UUIDs',
	description: '100 crypto-random UUIDs in one isolate. All unique. Sub-millisecond.',
	problem: 'Need UUIDs? crypto.randomUUID() on the edge. No library.',
	solution: 'One isolate, one line, 100 UUIDs.',
	result: '100 UUIDs, all unique, <1ms. Trace has the full list.',
	icon: 'key',
	tags: ['simple', 'uuid', 'crypto', 'generate'],
	steps: [
		{ name: 'Generate 100', description: 'crypto.randomUUID() × 100', code: 'Array.from({ length: 100 }, () => crypto.randomUUID())', input: {}, output: { generated: 100, allUnique: true }, capabilities: [], ms: 1 },
	],
};


// ─────────────────────────────────────────────────────────────────────────
// 10. SLUG + TRANSFORM
// ─────────────────────────────────────────────────────────────────────────

export const TRANSFORM_STRINGS_STEPS: ChainStep[] = [
	{
		name: 'Transform',
		body: `function slugify(s) {
  return s.toLowerCase().trim().replace(/[^\\w\\s-]/g, '').replace(/[\\s_]+/g, '-').replace(/-+/g, '-');
}
function camelCase(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase());
}
function titleCase(s) {
  return s.replace(/\\b\\w/g, c => c.toUpperCase());
}

const inputs = [
  'Hello World',
  'this is a test',
  'API Response Handler',
  'user--name  input',
  '  lots   of   spaces  ',
];

return inputs.map(s => ({
  original: s,
  slug: slugify(s),
  camel: camelCase(s),
  title: titleCase(s),
}));`,
		capabilities: [],
	},
];

export const transformStrings: ExampleData = {
	id: 'transform-strings',
	title: 'String Transforms',
	description: 'Slugify, camelCase, titleCase — 5 strings, all three transforms. One step.',
	problem: 'String transforms have edge cases. Don\'t guess the output — run it.',
	solution: 'Three transform functions, five inputs. Isolate returns every result.',
	result: '"API Response Handler" → "api-response-handler" / "apiResponseHandler". Exact.',
	icon: 'type',
	tags: ['simple', 'strings', 'transform', 'slug', 'camelCase'],
	steps: [
		{ name: 'Transform', description: 'slug + camel + title × 5 inputs', code: 'slugify("Hello World") → "hello-world"', input: {}, output: { transforms: 15 }, capabilities: [], ms: 1 },
	],
};
