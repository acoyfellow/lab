import { KNOWN_PATTERNS } from '$lib/home-snippets';
import { highlightCode } from '$lib/shiki.server';
import { renderLabChainSnippet } from '$lib/lab-chain-snippet.server';
import type { PageServerLoad } from './$types';

const RECEIPT_SHAPE_SNIPPET = `// GET /results/abc123def4.json
{
  "id":      "abc123def4",
  "type":    "chain",
  "outcome": { "ok": true, "result": { "score": "3/3", "verdict": "PASS" } },
  "steps": [
    { "name": "Spec",             "capabilities": [],        "ms": 12 },
    { "name": "Implement + test", "capabilities": [],        "ms": 18 },
    { "name": "Verdict",          "capabilities": [],        "ms":  3 }
  ],
  "createdAt": "2026-04-25T17:00:00Z"
}`;

export const load: PageServerLoad = async () => {
	const [receiptShape, ...patternHtmls] = await Promise.all([
		highlightCode(RECEIPT_SHAPE_SNIPPET, 'json'),
		...KNOWN_PATTERNS.map(async (p) => {
			return (await renderLabChainSnippet(p.code)) ?? (await highlightCode(p.code, 'typescript'));
		}),
	]);

	const knownPatterns = KNOWN_PATTERNS.map((p, i) => ({
		id: p.id,
		tab: p.tab,
		knownFrom: p.knownFrom,
		whatItDoes: p.whatItDoes,
		lines: p.lines,
		html: patternHtmls[i],
	}));

	return {
		codeHtml: { receiptShape },
		knownPatterns,
	};
};
