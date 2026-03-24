import type {
  ChainStep,
  RunGeneratePayload,
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

// Run code in sandbox (no capabilities)
export const runSandbox = query('unchecked', async (code: string): Promise<RunResult> => {
  const platform = getRequestEvent().platform;
  return callWorkerJSON<RunResult>(platform, '/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
});

// Run code with KV read capability
export const runKv = query('unchecked', async (code: string): Promise<RunResult> => {
  const platform = getRequestEvent().platform;
  return callWorkerJSON<RunResult>(platform, '/run/kv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
});

// Run a capability chain
export const runChain = query('unchecked', async (steps: ChainStep[]): Promise<RunResult> => {
  const platform = getRequestEvent().platform;
  return callWorkerJSON<RunResult>(platform, '/run/chain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ steps }),
  });
});

// Spawn recursive isolates (single payload for remote query)
export const runSpawn = query(
  'unchecked',
  async (payload: RunSpawnPayload): Promise<RunResult> => {
    const platform = getRequestEvent().platform;
    const { code, capabilities, depth } = payload;
    return callWorkerJSON<RunResult>(platform, '/run/spawn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, capabilities, depth }),
    });
  },
);

// Generate and run code via LLM
export const runGenerate = query(
  'unchecked',
  async (payload: RunGeneratePayload): Promise<RunResult> => {
    const platform = getRequestEvent().platform;
    const { prompt, capabilities } = payload;
    return callWorkerJSON<RunResult>(platform, '/run/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, capabilities }),
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
