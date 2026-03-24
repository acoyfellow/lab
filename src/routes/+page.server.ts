import { CLIENT_SNIPPET } from '$lib/home-snippets';
import { highlightCode } from '$lib/shiki.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const client = await highlightCode(CLIENT_SNIPPET, 'typescript');
	return { codeHtml: { client } };
};
