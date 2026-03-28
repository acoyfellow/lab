import type {
  ChainStep,
  RunGeneratePayload,
  RunGuestPayload,
  RunResult,
  RunSpawnPayload,
  SeedResult,
  TraceData,
} from '@acoyfellow/lab';
import { query, command, getRequestEvent } from '$app/server';
import { dev } from '$app/environment';

// Helper: call the lab worker
async function callWorker(
  platform: App.Platform | undefined,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (dev) {
    return fetch(`http://localhost:1337${endpoint}`, options);
  }
  return platform!.env!.WORKER.fetch(new Request(`http://worker${endpoint}`, options));
}

async function callWorkerJSON<T>(
  platform: App.Platform | undefined,
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await callWorker(platform, endpoint, options);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Service error' }));
      return body as T;
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Worker service temporarily unavailable. Please try again.');
    }
    throw error;
  }
}

// Run guest body (optional guest capabilities; see /docs/capabilities)
export const runSandbox = query('unchecked', async (payload: RunGuestPayload): Promise<RunResult> => {
  const platform = getRequestEvent().platform;
  const body = payload.body ?? payload.code;
  const capabilities = payload.capabilities ?? [];
  return callWorkerJSON<RunResult>(platform, '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body,
      template: payload.template,
      capabilities,
    }),
  });
});

// KV read + optional extra capabilities
export const runKv = query('unchecked', async (payload: RunGuestPayload): Promise<RunResult> => {
  const platform = getRequestEvent().platform;
  const body = payload.body ?? payload.code;
  const capabilities = payload.capabilities ?? [];
  return callWorkerJSON<RunResult>(platform, '/run/kv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body,
      template: payload.template,
      capabilities,
    }),
  });
});

// Run a capability chain
export const runChain = query('unchecked', async (steps: ChainStep[]): Promise<RunResult> => {
  const platform = getRequestEvent().platform;
  const stepsWire = steps.map((s) => {
    const b = s.body ?? s.code;
    const o: Record<string, unknown> = {
      body: b,
      capabilities: s.capabilities ?? [],
    };
    if (s.name !== undefined) o.name = s.name;
    if (s.template !== undefined) o.template = s.template;
    if (s.props !== undefined) o.props = s.props;
    if (s.input !== undefined) o.input = s.input;
    return o;
  });
  return callWorkerJSON<RunResult>(platform, '/run/chain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps: stepsWire }),
  });
});

// Spawn recursive isolates (single payload for remote query)
export const runSpawn = query(
  'unchecked',
  async (payload: RunSpawnPayload): Promise<RunResult> => {
    const platform = getRequestEvent().platform;
    const body = payload.body ?? payload.code;
    const { capabilities, depth, template } = payload;
    return callWorkerJSON<RunResult>(platform, '/run/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, capabilities, depth, template }),
    });
  },
);

// Generate and run code via LLM
export const runGenerate = query(
  'unchecked',
  async (payload: RunGeneratePayload): Promise<RunResult> => {
    const platform = getRequestEvent().platform;
    const { prompt, capabilities, template, input, mode, maxTokens, model } = payload;
    return callWorkerJSON<RunResult>(platform, '/run/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, capabilities, template, input, mode, maxTokens, model }),
    });
  },
);

// Seed KV with demo data
export const seedKv = command(
  'unchecked',
  async (_payload: void | undefined): Promise<SeedResult> => {
    const platform = getRequestEvent().platform;
    return callWorkerJSON<{ ok: boolean; seeded: number }>(platform, '/seed', {
      method: 'POST',
    });
  },
);

// Get a trace by ID
export const getTrace = query('unchecked', async (traceId: string): Promise<TraceData | { error: string }> => {
  const platform = getRequestEvent().platform;
  return callWorkerJSON<TraceData | { error: string }>(platform, `/t/${traceId}`);
});

// Durable Object SQL helpers
type DoSqlResult = { ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string };

export const doSqlQuery = query(
  'unchecked',
  async (payload: { doName: string; sql: string; params?: unknown[] }): Promise<DoSqlResult> => {
    const platform = getRequestEvent().platform;
    const result = await callWorkerJSON<{ ok: boolean; result?: { ok: boolean; rows?: Record<string, unknown>[]; error?: string }; error?: string }>(
      platform,
      '/invoke/do',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.doName, method: 'POST', path: '/sql/query', body: { sql: payload.sql, params: payload.params } }),
      },
    );
    if (!result.ok) return { ok: false, error: result.error ?? 'DO query failed' };
    return { ok: true, rows: result.result?.rows ?? [] };
  },
);

export const doSqlExec = command(
  'unchecked',
  async (payload: { doName: string; sql: string; params?: unknown[] }): Promise<{ ok: boolean; error?: string }> => {
    const platform = getRequestEvent().platform;
    const result = await callWorkerJSON<{ ok: boolean; error?: string }>(
      platform,
      '/invoke/do',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: payload.doName, method: 'POST', path: '/sql/exec', body: { sql: payload.sql, params: payload.params } }),
      },
    );
    return { ok: result.ok, error: result.error };
  },
);
