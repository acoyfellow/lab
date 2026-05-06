import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

/**
 * POST /receipts — proxy to the lab worker's create-receipt endpoint.
 * Backs `lab.createReceipt(...)` in the SDK.
 */
export const POST: RequestHandler = async ({ platform, request, url }) =>
	forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
