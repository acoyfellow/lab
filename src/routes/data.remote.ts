import type {
  ChainStep,
  RunGeneratePayload,
  RunGuestPayload,
  RunResult,
  RunSpawnPayload,
  SeedResult,
  SavedResult,
  Diagnosis,
  FixProposal,
  VerificationResult,
  Comparison,
} from '@acoyfellow/lab';
import { query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { fetchLabWorker, labWorkerOrigin } from '$lib/server/lab-worker';

function requireAuth() {
  const event = getRequestEvent();
  if (!event.locals.user) {
    error(401, 'Sign in to use this feature.');
  }
}

async function callWorkerJSON<T>(
  platform: App.Platform | undefined,
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetchLabWorker(platform, endpoint, options);
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Service error' }));
      return body as T;
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
      return {
        ok: false,
        error: `Lab Worker unavailable at ${labWorkerOrigin()}. Start \`bun run dev\` or set LAB_WORKER_ORIGIN/LAB_URL to a running Lab Worker.`,
      } as T;
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
    requireAuth();
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
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON<{ ok: boolean; seeded: number }>(platform, '/seed', {
      method: 'POST',
    });
  },
);

// Get a saved result by ID
export const getResult = query('unchecked', async (resultId: string): Promise<SavedResult | { error: string }> => {
  const platform = getRequestEvent().platform;
  return callWorkerJSON<SavedResult | { error: string }>(platform, `/results/${resultId}.json`);
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
    requireAuth();
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

// Self-healing loop
export const diagnose = query(
  'unchecked',
  async (traceId: string): Promise<{ ok: boolean; diagnosis?: Diagnosis; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, '/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId }),
    });
  },
);

export const propose = query(
  'unchecked',
  async (diagnosis: Diagnosis): Promise<{ ok: boolean; proposal?: FixProposal; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, '/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis }),
    });
  },
);

export const verify = query(
  'unchecked',
  async (payload: { proposal: FixProposal; baseTraceId?: string }): Promise<{ ok: boolean; result?: VerificationResult; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, '/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
);

export const compare = query(
  'unchecked',
  async (payload: { a: string; b: string }): Promise<{ ok: boolean; comparison?: Comparison; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, '/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
);

// Story helpers
export const listStories = query(
  'unchecked',
  async (options?: { createdBy?: string; status?: string; limit?: number }): Promise<{ ok: boolean; stories?: any[]; error?: string }> => {
    const platform = getRequestEvent().platform;
    const params = new URLSearchParams();
    if (options?.createdBy) params.set('createdBy', options.createdBy);
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return callWorkerJSON(platform, `/stories${query}`);
  },
);

export const getStory = query(
  'unchecked',
  async (storyId: string): Promise<{ ok: boolean; story?: any; error?: string }> => {
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, `/stories/${storyId}`);
  },
);

export const forkStory = command(
  'unchecked',
  async (payload: { storyId: string; fromChapterIndex: number; newTitle?: string }): Promise<{ ok: boolean; story?: any; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, `/stories/${payload.storyId}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromChapterIndex: payload.fromChapterIndex, newTitle: payload.newTitle }),
    });
  },
);

export const createStory = command(
  'unchecked',
  async (payload: { title: string; traceIds: string[]; visibility?: string; tags?: string[] }): Promise<{ ok: boolean; story?: any; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, '/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
);

export const appendToStory = command(
  'unchecked',
  async (payload: { storyId: string; traceId: string }): Promise<{ ok: boolean; chapter?: any; error?: string }> => {
    requireAuth();
    const platform = getRequestEvent().platform;
    return callWorkerJSON(platform, `/stories/${payload.storyId}/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId: payload.traceId }),
    });
  },
);
