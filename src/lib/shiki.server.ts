/**
 * Home page TypeScript teaser + tutorial step snippets. mdsvex /docs use plain `<pre>` (see `app.css` `.md-doc pre`).
 *
 * Cloudflare Workers: default Oniguruma WASM is awkward; use the JS regex engine instead.
 * @see https://shiki.matsu.io/guide/install#cloudflare-workers (WASM) — we skip WASM via RegExp engine.
 * @see https://shiki.matsu.io/guide/regexp-engines — createJavaScriptRegexEngine
 */
import { createHighlighter, createJavaScriptRegexEngine } from 'shiki';

const THEME = 'github-light' as const;

export type ShikiLang = 'typescript' | 'bash' | 'json';

let highlighter: Awaited<ReturnType<typeof createHighlighter>> | undefined;

async function getHighlighter() {
	if (!highlighter) {
		highlighter = await createHighlighter({
			themes: [THEME],
			langs: ['typescript', 'bash', 'json'],
			engine: createJavaScriptRegexEngine(),
		});
	}
	return highlighter;
}

export async function highlightCode(code: string, lang: ShikiLang): Promise<string> {
	const h = await getHighlighter();
	return h.codeToHtml(code, { lang, theme: THEME });
}
