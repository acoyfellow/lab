import { Data, Effect } from 'effect';
import type { LabCatalog } from './catalog.js';
import type {
  ChainStep,
  RunGeneratePayload,
  RunGuestPayload,
  RunResult,
  RunSpawnPayload,
  SeedResult,
  TraceData,
} from './types.js';
import { chainStepsForWire, guestWirePayload, normalizeBaseUrl, requestJSON } from './wire.js';

export type LabEffectClientOptions = {
  /** Origin only, e.g. `https://your-instance.example` (no trailing slash). */
  baseUrl: string;
  /** Defaults to global `fetch` (Node 18+, Workers, modern runtimes). */
  fetch?: typeof fetch;
};

export class HttpError extends Data.TaggedError('HttpError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

function tryRequestJSON<T>(
  baseUrl: string,
  fetchImpl: typeof fetch,
  path: string,
  init?: RequestInit
): Effect.Effect<T, HttpError> {
  return Effect.tryPromise({
    try: () => requestJSON<T>(baseUrl, fetchImpl, path, init),
    catch: (e) =>
      new HttpError({
        message: e instanceof Error ? e.message : String(e),
        cause: e,
      }),
  });
}

/** GET /lab/catalog — same JSON as `fetchLabCatalog` in `catalog.ts`. */
export function fetchLabCatalogEffect(
  options: LabEffectClientOptions
): Effect.Effect<LabCatalog, HttpError> {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  return tryRequestJSON<LabCatalog>(baseUrl, fetchImpl, '/lab/catalog', { method: 'GET' });
}

export type LabEffectClient = {
  readonly runSandbox: (
    payload: RunGuestPayload
  ) => Effect.Effect<RunResult, HttpError>;
  readonly runKv: (payload: RunGuestPayload) => Effect.Effect<RunResult, HttpError>;
  readonly runChain: (steps: ChainStep[]) => Effect.Effect<RunResult, HttpError>;
  readonly runSpawn: (payload: RunSpawnPayload) => Effect.Effect<RunResult, HttpError>;
  readonly runGenerate: (payload: RunGeneratePayload) => Effect.Effect<RunResult, HttpError>;
  readonly seed: () => Effect.Effect<SeedResult, HttpError>;
  /** Fetch saved-result JSON from the canonical `GET /t/:id.json` path. */
  readonly getTrace: (traceId: string) => Effect.Effect<TraceData | { error: string }, HttpError>;
  /** Explicit alias for `getTrace`; always uses `GET /t/:id.json`. */
  readonly getTraceJson: (traceId: string) => Effect.Effect<TraceData | { error: string }, HttpError>;
};

export function createLabEffectClient(options: LabEffectClientOptions): LabEffectClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  return {
    runSandbox(payload) {
      return tryRequestJSON<RunResult>(baseUrl, fetchImpl, '/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestWirePayload(payload)),
      });
    },
    runKv(payload) {
      return tryRequestJSON<RunResult>(baseUrl, fetchImpl, '/run/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestWirePayload(payload)),
      });
    },
    runChain(steps) {
      return tryRequestJSON<RunResult>(baseUrl, fetchImpl, '/run/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: chainStepsForWire(steps) }),
      });
    },
    runSpawn(payload) {
      const body = payload.body ?? payload.code;
      if (typeof body !== 'string' || !body.trim()) {
        return Effect.fail(new HttpError({ message: 'RunSpawnPayload requires body (or legacy code)' }));
      }
      const o: Record<string, unknown> = {
        body,
        capabilities: payload.capabilities,
      };
      if (payload.template !== undefined) o.template = payload.template;
      if (payload.depth !== undefined) o.depth = payload.depth;
      return tryRequestJSON<RunResult>(baseUrl, fetchImpl, '/run/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(o),
      });
    },
    runGenerate(payload) {
      const o: Record<string, unknown> = {
        prompt: payload.prompt,
        capabilities: payload.capabilities ?? [],
      };
      if (payload.template !== undefined) o.template = payload.template;
      return tryRequestJSON<RunResult>(baseUrl, fetchImpl, '/run/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(o),
      });
    },
    seed() {
      return tryRequestJSON<SeedResult>(baseUrl, fetchImpl, '/seed', {
        method: 'POST',
      });
    },
    getTrace(traceId) {
      return tryRequestJSON<TraceData | { error: string }>(
        baseUrl,
        fetchImpl,
        `/t/${traceId}.json`,
        { method: 'GET' }
      );
    },
    getTraceJson(traceId) {
      return tryRequestJSON<TraceData | { error: string }>(
        baseUrl,
        fetchImpl,
        `/t/${traceId}.json`,
        { method: 'GET' }
      );
    },
  };
}
