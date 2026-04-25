import type {
  ChainStep,
  RunGeneratePayload,
  RunGuestPayload,
  RunResult,
  RunSpawnPayload,
  SeedResult,
  SavedResult,
  CreateStoryRequest,
  CreateStoryResponse,
  GetStoryResponse,
  ForkStoryRequest,
  ForkStoryResponse,
  AppendToStoryRequest,
  AppendToStoryResponse,
  ListStoriesOptions,
  ListStoriesResponse,
  StoryStatus,
  Diagnosis,
  FixProposal,
  VerificationResult,
  Comparison,
} from './types.js';
import { chainStepsForWire, guestWirePayload, normalizeBaseUrl, requestJSON } from './wire.js';

export type LabClientOptions = {
  /** Origin only, e.g. `https://your-instance.example` (no trailing slash). */
  baseUrl: string;
  /** Defaults to global `fetch` (Node 18+, Workers, modern runtimes). */
  fetch?: typeof fetch;
  /**
   * Optional bearer token. When set, every request includes
   * `Authorization: Bearer <token>`. Required when the target lab instance
   * has `LAB_AUTH_TOKEN` configured.
   */
  token?: string;
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
  /** Create a story from multiple traces */
  createStory: (request: CreateStoryRequest) => Promise<CreateStoryResponse>;
  /** Get a story with all chapters */
  getStory: (id: string) => Promise<GetStoryResponse>;
  /** Fork a story from a specific chapter */
  forkStory: (storyId: string, chapterIndex: number, newTitle?: string) => Promise<ForkStoryResponse>;
  /** Append a trace to an existing story */
  appendToStory: (storyId: string, traceId: string) => Promise<AppendToStoryResponse>;
  /** List stories with optional filtering */
  listStories: (options?: ListStoriesOptions) => Promise<ListStoriesResponse>;
  /** Update story status */
  updateStoryStatus: (storyId: string, status: StoryStatus) => Promise<{ ok: boolean; error?: string }>;
  /** Diagnose a failed trace using Workers AI */
  diagnose: (traceId: string) => Promise<{ ok: boolean; diagnosis?: Diagnosis; error?: string }>;
  /** Propose a fix given a diagnosis */
  propose: (diagnosis: Diagnosis) => Promise<{ ok: boolean; proposal?: FixProposal; error?: string }>;
  /** Verify a proposed fix by running it in a sandbox */
  verify: (proposal: FixProposal, baseTraceId?: string) => Promise<{ ok: boolean; result?: VerificationResult; error?: string }>;
  /** Compare two traces and return diffs */
  compare: (traceIdA: string, traceIdB: string) => Promise<{ ok: boolean; comparison?: Comparison; error?: string }>;
};

export function createLabClient(options: LabClientOptions): LabClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const baseFetch = options.fetch ?? globalThis.fetch;
  const token = options.token?.trim();

  // If a token is configured, wrap fetch so every call carries the Authorization header.
  const fetchImpl: typeof fetch = token
    ? ((input, init) => {
        const headers = new Headers(init?.headers);
        if (!headers.has('authorization') && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return baseFetch(input, { ...init, headers });
      })
    : baseFetch;

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
    createStory(request) {
      return requestJSON<CreateStoryResponse>(baseUrl, fetchImpl, '/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    },
    getStory(id) {
      return requestJSON<GetStoryResponse>(baseUrl, fetchImpl, `/stories/${id}`, {
        method: 'GET',
      });
    },
    forkStory(storyId, chapterIndex, newTitle) {
      const body: ForkStoryRequest = { fromChapterIndex: chapterIndex };
      if (newTitle !== undefined) body.newTitle = newTitle;
      return requestJSON<ForkStoryResponse>(baseUrl, fetchImpl, `/stories/${storyId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    appendToStory(storyId, traceId) {
      const body: AppendToStoryRequest = { traceId };
      return requestJSON<AppendToStoryResponse>(baseUrl, fetchImpl, `/stories/${storyId}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    listStories(options = {}) {
      const params = new URLSearchParams();
      if (options.createdBy !== undefined) params.set('createdBy', options.createdBy);
      if (options.status !== undefined) params.set('status', options.status);
      if (options.visibility !== undefined) params.set('visibility', options.visibility);
      if (options.limit !== undefined) params.set('limit', String(options.limit));
      if (options.offset !== undefined) params.set('offset', String(options.offset));
      const query = params.toString() ? `?${params.toString()}` : '';
      return requestJSON<ListStoriesResponse>(baseUrl, fetchImpl, `/stories${query}`, {
        method: 'GET',
      });
    },
    updateStoryStatus(storyId, status) {
      return requestJSON<{ ok: boolean; error?: string }>(baseUrl, fetchImpl, `/stories/${storyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    diagnose(traceId) {
      return requestJSON<{ ok: boolean; diagnosis?: Diagnosis; error?: string }>(baseUrl, fetchImpl, '/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traceId }),
      });
    },
    propose(diagnosis) {
      return requestJSON<{ ok: boolean; proposal?: FixProposal; error?: string }>(baseUrl, fetchImpl, '/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosis }),
      });
    },
    verify(proposal, baseTraceId) {
      const body: Record<string, unknown> = { proposal };
      if (baseTraceId !== undefined) body.baseTraceId = baseTraceId;
      return requestJSON<{ ok: boolean; result?: VerificationResult; error?: string }>(baseUrl, fetchImpl, '/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    compare(traceIdA, traceIdB) {
      return requestJSON<{ ok: boolean; comparison?: Comparison; error?: string }>(baseUrl, fetchImpl, '/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: traceIdA, b: traceIdB }),
      });
    },
  };
}
