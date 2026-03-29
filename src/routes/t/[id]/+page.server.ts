import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const traceId = params.id;

  const response = await fetch(`/t/${traceId}.json`);

  if (!response.ok) {
    error(404, `Saved result ${traceId} not found`);
  }

  const trace = await response.json();
  return { trace };
};
