import type {
  ChainStep,
  RunGeneratePayload,
  RunGuestPayload,
  RunResult,
  RunSpawnPayload,
  SeedResult,
  SavedResult,
} from './types.js';
import { chainStepsForWire, guestWirePayload, normalizeBaseUrl, requestJSON } from './wire.js';

export type LabClientOptions = {
  /** Origin only, e.g. `https://your-instance.example` (no trailing slash). */
  baseUrl: string;
  /** Defaults to global `fetch` (Node 18+, Workers, modern runtimes). */
  fetch?: typeof fetch;
};

export type LabClient = {
  runSandbox: (payload: RunGuestPayload) => Promise<RunResult>;
  runKv: (payload: RunGuestPayload) => Promise<RunResult>;
  runChain: (steps: ChainStep[]) => Promise<RunResult>;
  runSpawn: (payload: RunSpawnPayload) => Promise<RunResult>;
  runGenerate: (payload: RunGeneratePayload) => Promise<RunResult>;
  seed: () => Promise<SeedResult>;
  /** Fetch saved-result JSON from the canonical `GET /results/:id.json` path. */
  getResult: (resultId: string) => Promise<SavedResult | { error: string }>;
};

export function createLabClient(options: LabClientOptions): LabClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetch ?? globalThis.fetch;

  return {
    runSandbox(payload) {
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestWirePayload(payload)),
      });
    },
    runKv(payload) {
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/kv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestWirePayload(payload)),
      });
    },
    runChain(steps) {
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: chainStepsForWire(steps) }),
      });
    },
    runSpawn(payload) {
      const body = payload.body ?? payload.code;
      if (typeof body !== 'string' || !body.trim()) {
        throw new Error('RunSpawnPayload requires body (or legacy code)');
      }
      const o: Record<string, unknown> = {
        body,
        capabilities: payload.capabilities,
      };
      if (payload.template !== undefined) o.template = payload.template;
      if (payload.depth !== undefined) o.depth = payload.depth;
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/spawn', {
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
      return requestJSON<RunResult>(baseUrl, fetchImpl, '/run/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(o),
      });
    },
    seed() {
      return requestJSON<SeedResult>(baseUrl, fetchImpl, '/seed', {
        method: 'POST',
      });
    },
    getResult(resultId) {
      return requestJSON<SavedResult | { error: string }>(baseUrl, fetchImpl, `/results/${resultId}.json`, {
        method: 'GET',
      });
    },
  };
}
