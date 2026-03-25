import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, platform }) => {
  const traceId = params.id;

  let response: Response;
  if (dev) {
    response = await fetch(`http://localhost:1337/t/${traceId}.json`);
  } else {
    response = await platform!.env!.WORKER.fetch(
      new Request(`http://worker/t/${traceId}.json`)
    );
  }

  if (!response.ok) {
    error(404, `Trace ${traceId} not found`);
  }

  const trace = await response.json();
  return json(trace);
};
