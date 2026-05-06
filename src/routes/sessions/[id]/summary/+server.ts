import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

/**
 * POST /sessions/:id/summary — proxy to lab worker.
 * Backs SDK.updateSessionSummary(sessionId, payload).
 */
export const POST: RequestHandler = async ({ platform, request, url }) =>
	forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
