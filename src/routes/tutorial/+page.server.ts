import {
  TUTORIAL_INSTALL,
  TUTORIAL_MCP_CONFIG,
  TUTORIAL_RUN_FROM_AGENT,
  TUTORIAL_RUN_CURL,
  TUTORIAL_FETCH_RESULT,
} from '$lib/tutorial/code-snippets';
import { highlightCode } from '$lib/shiki.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [install, mcpConfig, runFromAgent, runCurl, fetchResult] = await Promise.all([
    highlightCode(TUTORIAL_INSTALL, 'bash'),
    highlightCode(TUTORIAL_MCP_CONFIG, 'json'),
    highlightCode(TUTORIAL_RUN_FROM_AGENT, 'typescript'),
    highlightCode(TUTORIAL_RUN_CURL, 'bash'),
    highlightCode(TUTORIAL_FETCH_RESULT, 'bash'),
  ]);
  return { codeHtml: { install, mcpConfig, runFromAgent, runCurl, fetchResult } };
};
