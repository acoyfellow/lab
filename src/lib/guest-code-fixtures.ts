/**
 * Canonical guest bodies for Worker isolates (template `guest@v1`).
 * Isolates execute plain JavaScript — TypeScript type annotations in bodies will throw at runtime.
 */
import type { ChainStep } from '@acoyfellow/lab';
import { CHAIN_STEPS_FOR_CURL } from './home-snippets';

/** Default two-step chain used in Compose, tutorial MiniChain, dogfood, README. */
export const SIMPLE_CHAIN_STEPS: ChainStep[] = [
	{ body: 'return [1, 2, 3]', capabilities: [] },
	{ body: 'return input.map((n) => n * 2)', capabilities: [] },
];

/** JSON Healer example: demonstrates automatic JSON repair with trace */
export const JSON_HEALER_STEPS: ChainStep[] = [
	{
		name: 'Load Broken JSON',
		body: `const brokenJson = '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob",}]}';
return { brokenJson, attempt: 1 };`,
		capabilities: []
	},
	{
		name: 'Parse Attempt',
		body: `try {
  const parsed = JSON.parse(input.brokenJson);
  return { success: true, data: parsed, attempts: input.attempt };
} catch (error) {
  return { 
    success: false, 
    error: error.message,
    brokenJson: input.brokenJson,
    attempt: input.attempt 
  };
}`,
		capabilities: []
	},
	{
		name: 'Auto-Heal',
		body: `if (input.success) {
  return input;
}
let fixed = input.brokenJson;
fixed = fixed.replace(/,(\\s*[}\\]])/g, '$1');
try {
  const parsed = JSON.parse(fixed);
  return {
    success: true,
    data: parsed,
    attempts: input.attempt,
    fixed: true,
    diagnosis: 'Removed trailing comma'
  };
} catch (secondError) {
  return {
    success: false,
    error: secondError.message,
    brokenJson: fixed,
    attempt: input.attempt + 1
  };
}`,
		capabilities: []
	},
	{
		name: 'Validate',
		body: `return {
  healed: input.success,
  attempts: input.attempts || 1,
  data: input.data,
  fixes_applied: input.diagnosis || 'None needed'
};`,
		capabilities: []
	}
];

export function bodiesFromSteps(steps: readonly Pick<ChainStep, 'body' | 'code'>[]): string[] {
	return steps.map((s) => s.body ?? s.code ?? '');
}

/** Every documented / UI default guest body we must keep valid JS (for tests). */
export function allCanonicalGuestBodies(): string[] {
	return [
		...bodiesFromSteps(SIMPLE_CHAIN_STEPS),
		...bodiesFromSteps([...CHAIN_STEPS_FOR_CURL]),
		'return { ok: true, sum: 1 + 2 }',
		'return input.map((n) => n * n)',
		'return await d1.query("SELECT id, note FROM lab_demo WHERE id = 1")',
		'return { hello: "world" }',
		'return { ok: true, value: 1 + 1 }',
		'return { piMessageCount: 4, via: "pi-lab-bridge" }',
		'return input.piMessageCount * 2',
	];
}
