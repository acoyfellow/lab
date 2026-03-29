import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

export const GET: RequestHandler = async ({ platform, request, url }) =>
  forwardLabWorkerRequest(platform, request, `${url.pathname}${url.search}`);
