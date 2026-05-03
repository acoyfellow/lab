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

export type ReceiptReplayMode =
  | "inspect-only"
  | "rerun-sandbox"
  | "rerun-live-requires-approval"
  | "continue-from-here";

export type ReceiptReplay = {
  mode: ReceiptReplayMode;
  available?: boolean;
  reason?: string;
};

export type CreateReceiptPayload = {
  source: string;
  action: string;
  actor?: unknown;
  input?: unknown;
  output?: unknown;
  capabilities?: string[];
  replay?: ReceiptReplay;
  evidence?: unknown;
  metadata?: unknown;
  ok?: boolean;
  error?: string;
  reason?: string;
  parentId?: string;
  supersedes?: string;
  sessionId?: string;
  artifact?: ArtifactRef;
  timing?: {
    totalMs?: number;
    generateMs?: number;
    runMs?: number;
  };
};

export type CreateReceiptResult = {
  ok: boolean;
  resultId?: string;
  error?: string;
};

export type ArtifactRef = {
  provider?: "cloudflare-artifacts";
  repo: string;
  branch?: string;
  head?: string;
  remote?: string;
};

export type LabSessionStatus = "active" | "handoff" | "complete" | "failed";

export type LabSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: LabSessionStatus;
  artifact: ArtifactRef;
  receiptIds: string[];
  summary?: LabSessionSummary;
};

export type LabSessionSummary = {
  goal?: string;
  state?: string;
  nextAction?: string;
  risks: string[];
  importantReceiptIds: string[];
  updatedByReceiptId?: string;
  updatedAt: string;
};

export type CreateSessionPayload = {
  title?: string;
  artifact?: ArtifactRef;
};

export type CreateSessionResult = {
  ok: boolean;
  session?: LabSession;
  sessionId?: string;
  error?: string;
};

export type GetSessionResult = {
  ok: boolean;
  session?: LabSession;
  error?: string;
};

export type ListSessionsResult = {
  ok: boolean;
  sessions: LabSession[];
  error?: string;
};

export type UpdateSessionSummaryPayload = {
  goal?: string;
  state?: string;
  nextAction?: string;
  risks?: string[];
  importantReceiptIds?: string[];
  updatedByReceiptId?: string;
};

export type UpdateSessionSummaryResult = {
  ok: boolean;
  session?: LabSession;
  summary?: LabSessionSummary;
  error?: string;
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
  receipt?: Record<string, unknown>;
  lineage?: Record<string, string>;
};

// Story types
/** Story status values */
export type StoryStatus = 'in-progress' | 'completed' | 'failed' | 'approved';

/** Story visibility levels */
export type StoryVisibility = 'private' | 'team' | 'public';

/** Decision point in a story chapter */
export interface DecisionPoint {
  question: string;
  options: string[];
  chosen: number;
  reasoning: string;
}

/** Story chapter linking a trace to a narrative */
export interface StoryChapter {
  id: string;
  storyId: string;
  chapterIndex: number;
  traceId: string;
  title?: string;
  summary?: string;
  decisionPoint?: DecisionPoint;
}

/** Story composed of multiple traces for debugging and team review */
export interface Story {
  id: string;
  title: string;
  createdAt: string;
  createdBy?: string;
  status: StoryStatus;
  visibility: StoryVisibility;
  tags?: string[];
  chapters?: StoryChapter[];
}

/** Request to create a new story */
export interface CreateStoryRequest {
  title: string;
  traceIds: string[];
  createdBy?: string;
  visibility?: StoryVisibility;
  tags?: string[];
}

/** Response from create story */
export interface CreateStoryResponse {
  ok: boolean;
  story?: Story;
  error?: string;
}

/** Response from get story */
export interface GetStoryResponse {
  ok: boolean;
  story?: Story;
  error?: string;
}

/** Request to fork a story */
export interface ForkStoryRequest {
  fromChapterIndex: number;
  newTitle?: string;
}

/** Response from fork story */
export interface ForkStoryResponse {
  ok: boolean;
  story?: Story;
  error?: string;
}

/** Request to append to a story */
export interface AppendToStoryRequest {
  traceId: string;
}

/** Response from append to story */
export interface AppendToStoryResponse {
  ok: boolean;
  chapter?: StoryChapter;
  error?: string;
}

/** Options for listing stories */
export interface ListStoriesOptions {
  createdBy?: string;
  status?: StoryStatus;
  visibility?: StoryVisibility;
  limit?: number;
  offset?: number;
}

/** Response from list stories */
export interface ListStoriesResponse {
  ok: boolean;
  stories?: Story[];
  error?: string;
}

// --- Self-healing loop types ---

export type DiagnosisCategory =
  | "syntax_error"
  | "runtime_error"
  | "capability_denied"
  | "timeout"
  | "logic_error"
  | "unknown";

export interface DiagnosisProblem {
  category: DiagnosisCategory;
  stepIndex: number | null;
  description: string;
}

export interface Diagnosis {
  problem: DiagnosisProblem;
  context: {
    errorMessage: string;
    traceId: string;
    code?: string;
    input?: unknown;
    capabilities?: string[];
  };
  hints: string[];
  confidence: "high" | "medium" | "low";
}

export type FixType = "code_change" | "capability_change" | "input_change" | "template_change";

export interface FixProposal {
  type: FixType;
  description: string;
  changes: {
    body?: string;
    capabilities?: string[];
    template?: string;
    input?: unknown;
  };
  reasoning: string;
  estimatedConfidence: "high" | "medium" | "low";
}

export interface VerificationResult {
  traceId: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface TraceDiff {
  input: {
    before: unknown;
    after: unknown;
    changed: boolean;
  };
  code: {
    before: string | null;
    after: string | null;
    changed: boolean;
  };
  output: {
    before: unknown;
    after: unknown;
    changed: boolean;
  };
  error: {
    before: string | null;
    after: string | null;
    resolved: boolean;
    introduced: boolean;
  };
  steps?: {
    before: number;
    after: number;
  };
}

export interface Comparison {
  traceA: string;
  traceB: string;
  diff: TraceDiff;
  summary: string;
}
