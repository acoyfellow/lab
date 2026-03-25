import type { ChainStep, RunGuestPayload } from './types.js';

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function guestWirePayload(p: RunGuestPayload): Record<string, unknown> {
  const body = p.body ?? p.code;
  if (typeof body !== 'string' || !body.trim()) {
    throw new Error('RunGuestPayload requires body (or legacy code)');
  }
  const o: Record<string, unknown> = { body, capabilities: p.capabilities ?? [] };
  if (p.template !== undefined) o.template = p.template;
  return o;
}

export function chainStepsForWire(steps: ChainStep[]): unknown[] {
  return steps.map((s) => {
    const body = s.body ?? s.code;
    if (typeof body !== 'string' || !body.trim()) {
      throw new Error('Each ChainStep needs body (or legacy code)');
    }
    const o: Record<string, unknown> = {
      body,
      capabilities: s.capabilities ?? [],
    };
    if (s.name !== undefined) o.name = s.name;
    if (s.template !== undefined) o.template = s.template;
    if (s.props !== undefined) o.props = s.props;
    if (s.input !== undefined) o.input = s.input;
    return o;
  });
}

/**
 * Parses JSON for every response, including non-2xx — same behavior as the
 * SvelteKit `callWorkerJSON` helper, so error bodies like `{ error: string }`
 * are returned instead of thrown.
 */
export async function requestJSON<T>(
  baseUrl: string,
  fetchImpl: typeof fetch,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await fetchImpl(url, init);
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Expected JSON from ${url}${!response.ok ? ` (${response.status})` : ''}`);
  }
}
