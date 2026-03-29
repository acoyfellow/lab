import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

const PUBLIC_RUN_MODES = new Set(['kv', 'chain', 'spawn', 'generate']);

export const POST: RequestHandler = async ({ params, platform, request, url }) => {
  if (!PUBLIC_RUN_MODES.has(params.mode)) {
    error(404, `Unknown run mode: ${params.mode}`);
  }

  return forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
};
