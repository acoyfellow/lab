import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const resultId = params.id;

  const response = await fetch(`/results/${resultId}.json`);

  if (!response.ok) {
    error(404, `Saved result ${resultId} not found`);
  }

  const result = await response.json();
  return { result };
};
