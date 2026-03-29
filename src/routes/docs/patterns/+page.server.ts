import type { PageServerLoad } from './$types';
import { docsHeadingId } from '$lib/docs-heading-id';
import patternsSource from '$lib/content/docs/patterns.svelte.md?raw';
import { marked } from 'marked';
import { highlightCode, type ShikiLang } from '$lib/shiki.server';

const FENCE = /```(\w*)\r?\n([\s\S]*?)```/g;

function mapFenceLang(fence: string): ShikiLang {
	if (fence === 'js' || fence === 'javascript' || fence === 'ts' || fence === 'typescript')
		return 'typescript';
	if (fence === 'json') return 'json';
	if (fence === 'bash' || fence === 'sh' || fence === 'shell') return 'bash';
	return 'typescript';
}

async function renderPatternsHtml(source: string): Promise<string> {
	const parts: string[] = [];
	let last = 0;
	FENCE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = FENCE.exec(source)) !== null) {
		const before = source.slice(last, m.index);
		if (before) {
			parts.push(marked.parse(before, { async: false }) as string);
		}
		const code = m[2].replace(/\n$/, '');
		const html = await highlightCode(code, mapFenceLang(m[1] ?? ''));
		parts.push(
			`<div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">${html}</div>`
		);
		last = m.index + m[0].length;
	}
	const tail = source.slice(last);
	if (tail) {
		parts.push(marked.parse(tail, { async: false }) as string);
	}
	return parts.join('');
}

function addDocHeadingIds(html: string): string {
	let out = html.replace(/<h1>([^<]+)<\/h1>/, (_, text: string) => {
		return `<h1 id="${docsHeadingId(text)}">${text}</h1>`;
	});
	out = out.replace(/<h2>([^<]+)<\/h2>/g, (_, text: string) => {
		return `<h2 id="${docsHeadingId(text)}">${text}</h2>`;
	});
	return out;
}

export const load: PageServerLoad = async () => {
	const raw = await renderPatternsHtml(patternsSource);
	const articleHtml = addDocHeadingIds(raw);
	return { articleHtml };
};
