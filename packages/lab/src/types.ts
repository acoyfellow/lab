/** Response shape from run endpoints (mirrors worker + SvelteKit `data.remote.ts`). */
export type RunResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
  reason?: string;
  resultId?: string;
  steps?: SavedResultStep[];
  generated?: string;
  generateMs?: number;
  runMs?: number;
};

export type SavedResultStep = {
  step: number;
  name?: string;
  template?: string;
  body?: string;
  capabilities: string[];
  input: unknown;
  output: unknown;
  ms: number;
};

/** One step in `POST /run/chain`. */
export type ChainStep = {
  name?: string;
  /** Guest template id (default `guest@v1`). */
  template?: string;
  /** JavaScript guest body (inserted into the isolate shell). */
  body?: string;
  /** Legacy alias for `body` on the wire. */
  code?: string;
  capabilities: string[];
  /** Optional explicit input for this step (overrides chain carry). */
  props?: unknown;
  input?: unknown;
};

export type RunGuestPayload = {
  body?: string;
  template?: string;
  capabilities?: string[];
  /** Legacy alias for `body`. */
  code?: string;
};

export type RunSpawnPayload = {
  body?: string;
  template?: string;
  capabilities: string[];
  /** Omitted uses server default (currently 2). */
  depth?: number;
  /** Legacy alias for `body`. */
  code?: string;
};

export type RunGeneratePayload = {
  prompt: string;
  capabilities: string[];
  /** Shell for the generated body (default `guest@v1`). */
  template?: string;
  /** Optional structured input injected as `input` in guest body. */
  input?: unknown;
  /** `json` returns parsed JSON directly; `code` runs generated guest body. */
  mode?: "code" | "json";
  /** Max tokens for LLM output (default 2048, max 4096). */
  maxTokens?: number;
  /** Workers AI model ID override (default `@cf/meta/llama-3.1-8b-instruct`). */
  model?: string;
};

/** `POST /seed` response. */
export type SeedResult = {
  ok: boolean;
  seeded: number;
};

/** Stored saved-result JSON from `GET /results/:id.json` (aligned with worker `StoredResult`). */
export type SavedResult = {
  id: string;
  type: string;
  createdAt: string;
  request: Record<string, unknown>;
  outcome: Record<string, unknown>;
  timing?: Record<string, number>;
  generated?: string;
  steps?: Array<Record<string, unknown>>;
};
