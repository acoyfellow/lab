import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

/**
 * Sessions API proxy:
 *   POST /sessions   — create  → SDK.createSession
 *   GET  /sessions   — list    → SDK.listSessions
 *
 * SvelteKit allows +server.ts alongside +page.svelte: the page handles
 * GET text/html (browsers), the +server.ts methods handle other requests.
 */
export const POST: RequestHandler = async ({ platform, request, url }) =>
	forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);

export const GET: RequestHandler = async ({ platform, request, url }) =>
	forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
