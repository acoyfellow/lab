import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchLabWorker } from '$lib/server/lab-worker';

export const GET: RequestHandler = async ({ params, platform }) => {
  const resultId = params.id;

  const response = await fetchLabWorker(platform, `/results/${resultId}.json`);

  if (!response.ok) {
    error(404, `Receipt ${resultId} not found`);
  }

  const result = await response.json();
  return json(result);
};
