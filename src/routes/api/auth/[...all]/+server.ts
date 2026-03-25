import { initAuth } from '$lib/auth';
import type { RequestHandler } from './$types';

function handleAuth(request: Request, platform: App.Platform | undefined) {
  const url = new URL(request.url);
  const db = platform?.env?.DB;
  if (!db) throw new Error('D1 database binding missing');
  const auth = initAuth(db, platform?.env, url.origin);
  return auth.handler(request);
}

export const GET: RequestHandler = async ({ request, platform }) =>
  handleAuth(request, platform);

export const POST: RequestHandler = async ({ request, platform }) =>
  handleAuth(request, platform);
