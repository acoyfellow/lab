import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchLabWorker } from '$lib/server/lab-worker';

export const GET: RequestHandler = async ({ params, platform }) => {
  const traceId = params.id;

  const response = await fetchLabWorker(platform, `/t/${traceId}.json`);

  if (!response.ok) {
    error(404, `Saved result ${traceId} not found`);
  }

  const trace = await response.json();
  return json(trace);
};
