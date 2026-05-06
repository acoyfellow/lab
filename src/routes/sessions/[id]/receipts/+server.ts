import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

/**
 * POST /sessions/:id/receipts — proxy to lab worker.
 * Backs SDK.createSessionReceipt(sessionId, payload).
 */
export const POST: RequestHandler = async ({ platform, request, url }) =>
	forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
