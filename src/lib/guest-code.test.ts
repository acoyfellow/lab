import { describe, expect, test } from 'bun:test';
import { parse } from 'acorn';
import { allCanonicalGuestBodies } from './guest-code-fixtures';

/** Same wrapping as worker `guestBodySyntaxError` / isolate shell: body runs inside an async IIFE. */
function assertParsesAsGuestJs(code: string) {
	const wrapped = `(async () => {\n${code}\n})()`;
	parse(wrapped, { ecmaVersion: 2022, sourceType: 'script' });
}

const TS_PARAM_ANNOTATION = /\([a-zA-Z_$][\w$]*\s*:\s*(number|string|boolean|unknown|never)\)/;

describe('guest isolate code', () => {
	test('canonical samples parse as JavaScript (not TypeScript)', () => {
		for (const code of allCanonicalGuestBodies()) {
			try {
				assertParsesAsGuestJs(code);
			} catch (e) {
				throw new Error(
					`Expected guest body to parse as JS. Worker loaders do not transpile TS.\n---\n${code}\n---\n${e}`,
				);
			}
		}
	});

	test('no TypeScript-only parameter annotations in canonical bodies', () => {
		for (const code of allCanonicalGuestBodies()) {
			expect(code).not.toMatch(TS_PARAM_ANNOTATION);
		}
	});
});
