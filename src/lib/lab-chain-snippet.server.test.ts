import { describe, expect, test } from 'bun:test';
import { renderLabChainSnippet } from './lab-chain-snippet.server';

describe('renderLabChainSnippet', () => {
	test('returns null for non-chain code', async () => {
		expect(await renderLabChainSnippet('const x = 1;')).toBeNull();
	});

	test('renders chain bodies with nested template expressions', async () => {
		const code = `const out = await lab.runChain([
  {
    name: "Nested",
    body: \`const label = \${input.ok ? \`ok-\${input.id}\` : "nope"};
return { label };\`,
    capabilities: []
  }
]);`;

		const html = await renderLabChainSnippet(code);

		expect(html).toContain('ok-');
		expect(html).toContain('return');
		expect(html).toContain('shiki-code-block');
	});
});
