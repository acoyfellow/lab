import type { RequestHandler } from './$types';
import { forwardLabWorkerRequest } from '$lib/server/lab-worker';

export const GET: RequestHandler = async ({ params, platform, request, url }) =>
  forwardLabWorkerRequest(platform, request, `/t/${params.id}${url.search}`);
