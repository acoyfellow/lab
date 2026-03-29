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

export type HighlightedCodeLines = {
	preAttributes: string;
	lines: string[];
};

export type HighlightedToken = {
	content: string;
	offset: number;
	color?: string;
	fontStyle?: number;
};

export type TokenizedCode = {
	preAttributes: string;
	fg: string;
	bg: string;
	lines: HighlightedToken[][];
};

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

export async function tokenizeCode(code: string, lang: ShikiLang): Promise<TokenizedCode> {
	const h = await getHighlighter();
	const result = await h.codeToTokens(code, { lang, theme: THEME });

	return {
		preAttributes: ` class="shiki ${result.themeName ?? THEME}" style="background-color:${result.bg ?? '#fff'};color:${result.fg ?? '#24292e'}"`,
		fg: result.fg ?? '#24292e',
		bg: result.bg ?? '#fff',
		lines: result.tokens,
	};
}

export async function highlightCodeLines(
	code: string,
	lang: ShikiLang
): Promise<HighlightedCodeLines> {
	const html = await highlightCode(code, lang);
	const preAttributes = html.match(/<pre([^>]*)>/)?.[1] ?? ' class="shiki"';
	const codeInner = html.match(/<code>([\s\S]*?)<\/code>/)?.[1] ?? '';
	const lines = [...codeInner.matchAll(/<span class="line">[\s\S]*?<\/span>/g)].map(
		(match) => match[0]
	);

	return {
		preAttributes,
		lines: lines.length > 0 ? lines : ['<span class="line"></span>'],
	};
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function tokenStyle(token: HighlightedToken, fg: string): string {
	const styles: string[] = [];
	if (token.color && token.color !== fg) {
		styles.push(`color:${token.color}`);
	}
	if (token.fontStyle) {
		if (token.fontStyle & 1) styles.push('font-style:italic');
		if (token.fontStyle & 2) styles.push('font-weight:700');
		if (token.fontStyle & 4) styles.push('text-decoration:underline');
	}
	return styles.join(';');
}

export function renderTokenizedCode(
	tokenized: TokenizedCode,
	lineClassNames?: Map<number, string>
): string {
	const lineHtml = tokenized.lines.map((line, lineIndex) => {
		const className = ['line', lineClassNames?.get(lineIndex)].filter(Boolean).join(' ');
		const tokensHtml = line
			.map((token) => {
				const content = escapeHtml(token.content);
				const style = tokenStyle(token, tokenized.fg);
				return style ? `<span style="${style}">${content}</span>` : content;
			})
			.join('');
		return `<span class="${className}">${tokensHtml}</span>`;
	});

	return `<pre${tokenized.preAttributes}><code>${lineHtml.join('\n')}</code></pre>`;
}
