import { CLIENT_SNIPPET, KNOWN_PATTERNS } from '$lib/home-snippets';
import { highlightCode } from '$lib/shiki.server';
import { renderLabChainSnippet } from '$lib/lab-chain-snippet.server';
import type { PageServerLoad } from './$types';

const INSTALL_SNIPPET = `npm install @acoyfellow/lab`;

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

const SDK_SNIPPET = `import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: "https://lab.coey.dev"
});

const r = await lab.runChain([
  { name: "step", body: "return 40 + 2" }
]);

console.log(r.resultId);
// → abc123def4`;

const CURL_SNIPPET = `curl -X POST https://lab.coey.dev/run \\
  -H 'content-type: application/json' \\
  -d '{
    "body": "return 40 + 2",
    "capabilities": []
  }'

# → { "ok": true, "result": 42,
#      "resultId": "abc123def4" }`;

export const load: PageServerLoad = async () => {
	const [client, install, receiptShape, sdk, curl, ...patternHtmls] = await Promise.all([
		highlightCode(CLIENT_SNIPPET, 'typescript'),
		highlightCode(INSTALL_SNIPPET, 'bash'),
		highlightCode(RECEIPT_SHAPE_SNIPPET, 'json'),
		highlightCode(SDK_SNIPPET, 'typescript'),
		highlightCode(CURL_SNIPPET, 'bash'),
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
		codeHtml: { client, install, receiptShape, sdk, curl },
		knownPatterns,
	};
};
