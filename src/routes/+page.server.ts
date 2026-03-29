import { CLIENT_SNIPPET, KNOWN_PATTERNS } from '$lib/home-snippets';
import { highlightCode } from '$lib/shiki.server';
import type { PageServerLoad } from './$types';

const INSTALL_SNIPPET = `npm install @acoyfellow/lab`;

export const load: PageServerLoad = async () => {
	const [client, install, ...patternHtmls] = await Promise.all([
		highlightCode(CLIENT_SNIPPET, 'typescript'),
		highlightCode(INSTALL_SNIPPET, 'bash'),
		...KNOWN_PATTERNS.map((p) => highlightCode(p.code, 'typescript')),
	]);

	const knownPatterns = KNOWN_PATTERNS.map((p, i) => ({
		id: p.id,
		tab: p.tab,
		knownFrom: p.knownFrom,
		whatItDoes: p.whatItDoes,
		lines: p.lines,
		html: patternHtmls[i],
	}));

	return { codeHtml: { client, install }, knownPatterns };
};
