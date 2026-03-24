import type {
  ChainStep,
  RunGeneratePayload,
  RunResult,
  RunSpawnPayload,
  SeedResult,
  TraceData,
} from './types.js';

export type LabClientOptions = {
  /** Origin only, e.g. `https://lab.coey.dev` (no trailing slash). */
  baseUrl: string;
  /** Defaults to global `fetch` (Node 18+, Workers, modern runtimes). */
  fetch?: typeof fetch;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Parses JSON for every response, including non-2xx — same behavior as the
 * SvelteKit `callWorkerJSON` helper, so error bodies like `{ error: string }`
 * are returned instead of thrown.
 */
async function requestJSON<T>(
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

export type LabClient = {
  runSandbox: (code: string) => Promise<RunResult>;
  runKv: (code: string) => Promise<RunResult>;
  runChain: (steps: ChainStep[]) => Promise<RunResult>;
  runSpawn: (payload: RunSpawnPayload) => Promise<RunResult>;
  runGenerate: (payload: RunGeneratePayload) => Promise<RunResult>;
  seed: () => Promise<SeedResult>;
  getTrace: (traceId: string) => Promise<TraceData | { error: string }>;
};

export function createLabClient(options: LabClientOptions): LabClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  return {
    runSandbox(code) {
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
    },
    runKv(code) {
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
    },
    runChain(steps) {
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps }),
      });
    },
    runSpawn(payload) {
      const { code, capabilities, depth } = payload;
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, capabilities, depth }),
      });
    },
    runGenerate(payload) {
      const { prompt, capabilities } = payload;
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, capabilities }),
      });
    },
    seed() {
      return requestJSON<SeedResult>(baseUrl, fetchImpl, '/seed', {
        method: 'POST',
      });
    },
    getTrace(traceId) {
      return requestJSON<TraceData | { error: string }>(baseUrl, fetchImpl, `/t/${traceId}`, {
        method: 'GET',
      });
    },
  };
}
