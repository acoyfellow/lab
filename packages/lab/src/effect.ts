import { Data, Effect } from 'effect';
import type { LabCatalog } from './catalog.js';
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
} from './types.js';
import { chainStepsForWire, guestWirePayload, normalizeBaseUrl, requestJSON } from './wire.js';

export type LabEffectClientOptions = {
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

function withBearerToken(baseFetch: typeof fetch, token: string | undefined): typeof fetch {
  if (!token) return baseFetch;
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (!headers.has('authorization') && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return baseFetch(input, { ...init, headers });
  };
}

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
  const fetchImpl = withBearerToken(options.fetch ?? globalThis.fetch, options.token?.trim());
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
  /** Fetch saved-result JSON from the canonical `GET /results/:id.json` path. */
  readonly getResult: (resultId: string) => Effect.Effect<SavedResult | { error: string }, HttpError>;
  /** Create a story from multiple traces */
  readonly createStory: (request: CreateStoryRequest) => Effect.Effect<CreateStoryResponse, HttpError>;
  /** Get a story with all chapters */
  readonly getStory: (id: string) => Effect.Effect<GetStoryResponse, HttpError>;
  /** Fork a story from a specific chapter */
  readonly forkStory: (storyId: string, chapterIndex: number, newTitle?: string) => Effect.Effect<ForkStoryResponse, HttpError>;
  /** Append a trace to an existing story */
  readonly appendToStory: (storyId: string, traceId: string) => Effect.Effect<AppendToStoryResponse, HttpError>;
  /** List stories with optional filtering */
  readonly listStories: (options?: ListStoriesOptions) => Effect.Effect<ListStoriesResponse, HttpError>;
  /** Update story status */
  readonly updateStoryStatus: (storyId: string, status: StoryStatus) => Effect.Effect<{ ok: boolean; error?: string }, HttpError>;
};

export function createLabEffectClient(options: LabEffectClientOptions): LabEffectClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = withBearerToken(options.fetch ?? globalThis.fetch, options.token?.trim());

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
    getResult(resultId) {
      return tryRequestJSON<SavedResult | { error: string }>(
        baseUrl,
        fetchImpl,
        `/results/${resultId}.json`,
        { method: 'GET' }
      );
    },
    createStory(request) {
      return tryRequestJSON<CreateStoryResponse>(baseUrl, fetchImpl, '/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
    },
    getStory(id) {
      return tryRequestJSON<GetStoryResponse>(baseUrl, fetchImpl, `/stories/${id}`, {
        method: 'GET',
      });
    },
    forkStory(storyId, chapterIndex, newTitle) {
      const body: ForkStoryRequest = { fromChapterIndex: chapterIndex };
      if (newTitle !== undefined) body.newTitle = newTitle;
      return tryRequestJSON<ForkStoryResponse>(baseUrl, fetchImpl, `/stories/${storyId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    appendToStory(storyId, traceId) {
      const body: AppendToStoryRequest = { traceId };
      return tryRequestJSON<AppendToStoryResponse>(baseUrl, fetchImpl, `/stories/${storyId}/append`, {
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
      return tryRequestJSON<ListStoriesResponse>(baseUrl, fetchImpl, `/stories${query}`, {
        method: 'GET',
      });
    },
    updateStoryStatus(storyId, status) {
      return tryRequestJSON<{ ok: boolean; error?: string }>(
        baseUrl,
        fetchImpl,
        `/stories/${storyId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
    },
  };
}
