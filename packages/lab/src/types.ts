/** Response shape from run endpoints (mirrors worker + SvelteKit `data.remote.ts`). */
export type RunResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
  reason?: string;
  traceId?: string;
  trace?: TraceStep[];
  generated?: string;
  generateMs?: number;
  runMs?: number;
};

export type TraceStep = {
  step: number;
  name?: string;
  capabilities: string[];
  input: unknown;
  output: unknown;
  ms: number;
};

/** One step in `POST /run/chain`. */
export type ChainStep = {
  name?: string;
  code: string;
  capabilities: string[];
};

export type RunSpawnPayload = {
  code: string;
  capabilities: string[];
  /** Omitted uses server default (currently 2). */
  depth?: number;
};

export type RunGeneratePayload = {
  prompt: string;
  capabilities: string[];
};

/** `POST /seed` response. */
export type SeedResult = {
  ok: boolean;
  seeded: number;
};

/** Stored trace document from `GET /t/:id` (aligned with worker `StoredTrace`). */
export type TraceData = {
  id: string;
  type: string;
  createdAt: string;
  request: Record<string, unknown>;
  outcome: Record<string, unknown>;
  timing?: Record<string, number>;
  generated?: string;
  trace?: Array<Record<string, unknown>>;
};
