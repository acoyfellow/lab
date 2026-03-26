import { TUTORIAL_STEP2_CODE } from '$lib/tutorial/code-snippets';
import { highlightCode } from '$lib/shiki.server';
import type { PageServerLoad } from './$types';

const INSTALL_SNIPPET = `npm install @acoyfellow/lab`;

export const load: PageServerLoad = async () => {
  const client = await highlightCode(TUTORIAL_STEP2_CODE, 'typescript');
  const install = await highlightCode(INSTALL_SNIPPET, 'bash');
  return { codeHtml: { client, install } };
};