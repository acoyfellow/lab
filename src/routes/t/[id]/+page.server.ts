import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fetchLabWorker } from '$lib/server/lab-worker';

export const load: PageServerLoad = async ({ params, platform }) => {
  const traceId = params.id;

  const response = await fetchLabWorker(platform, `/t/${traceId}`);

  if (!response.ok) {
    error(404, `Trace ${traceId} not found`);
  }

  const trace = await response.json();
  return { trace };
};
