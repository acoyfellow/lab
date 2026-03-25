/**
 * Canonical guest `code` strings for Worker isolates.
 * Isolates execute plain JavaScript — TypeScript type annotations in `code` will throw at runtime.
 */
import type { ChainStep } from '@acoyfellow/lab';
import { CHAIN_STEPS_FOR_CURL } from './home-snippets';

/** Default two-step chain used in Compose, tutorial MiniChain, dogfood, README. */
export const SIMPLE_CHAIN_STEPS: ChainStep[] = [
	{ code: 'return [1, 2, 3]', capabilities: [] },
	{ code: 'return input.map((n) => n * 2)', capabilities: [] },
];

export function codesFromSteps(steps: readonly { code: string }[]): string[] {
	return steps.map((s) => s.code);
}

/** Every documented / UI default guest body we must keep valid JS (for tests). */
export function allCanonicalGuestBodies(): string[] {
	return [
		...codesFromSteps(SIMPLE_CHAIN_STEPS),
		...codesFromSteps(CHAIN_STEPS_FOR_CURL),
		'return { ok: true, sum: 1 + 2 }',
		'return input.map((n) => n * n)',
		'return await d1.query("SELECT id, note FROM lab_demo WHERE id = 1")',
		'return { hello: "world" }',
		'return { ok: true, value: 1 + 1 }',
		'return { piMessageCount: 4, via: "pi-lab-bridge" }',
		'return input.piMessageCount * 2',
	];
}
