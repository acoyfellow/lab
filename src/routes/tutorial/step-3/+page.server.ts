import piLabBridgeSource from '../../../../scripts/pi-lab-bridge.ts?raw';
import { TUTORIAL_STEP3_FETCH_TRACE, TUTORIAL_STEP3_LAB_CLIENT } from '$lib/tutorial/code-snippets';
import { highlightCode } from '$lib/shiki.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [piLabBridge, labClient, fetchTrace] = await Promise.all([
    highlightCode(piLabBridgeSource, 'typescript'),
    highlightCode(TUTORIAL_STEP3_LAB_CLIENT, 'typescript'),
    highlightCode(TUTORIAL_STEP3_FETCH_TRACE, 'bash'),
  ]);
  return { codeHtml: { piLabBridge, labClient, fetchTrace } };
};
