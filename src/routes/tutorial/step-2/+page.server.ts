import { TUTORIAL_STEP2_CURL } from '$lib/tutorial/code-snippets';
import { highlightCode } from '$lib/shiki.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const curl = await highlightCode(TUTORIAL_STEP2_CURL, 'bash');
  return { codeHtml: { curl } };
};
