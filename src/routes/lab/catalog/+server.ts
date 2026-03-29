import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchLabWorker } from '$lib/server/lab-worker';

export const GET: RequestHandler = async ({ platform }) => {
  const response = await fetchLabWorker(platform, '/lab/catalog');

  if (!response.ok) {
    error(response.status, 'Lab catalog unavailable');
  }

  const catalog = await response.json();
  return json(catalog);
};
