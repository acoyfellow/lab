import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

/**
 * GET /sessions/:id — proxy to lab worker, backs SDK.getSession
 */
export const GET: RequestHandler = async ({ platform, request, url }) =>
	forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
