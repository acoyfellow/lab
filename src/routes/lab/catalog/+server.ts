import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  let response: Response;
  if (dev) {
    response = await fetch('http://localhost:1337/lab/catalog');
  } else {
    response = await platform!.env!.WORKER.fetch(new Request('http://worker/lab/catalog'));
  }

  if (!response.ok) {
    error(response.status, 'Lab catalog unavailable');
  }

  const catalog = await response.json();
  return json(catalog);
};
