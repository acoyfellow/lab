import { CAPABILITY_REGISTRY } from "./capabilities/registry"
import { GUEST_TEMPLATE_IDS } from "./guest/templates"
import pkg from "../package.json"

/** Kept in sync with root package.json `version`. */
export const LAB_PKG_VERSION = pkg.version

export function buildLabCatalog() {
  return {
    version: LAB_PKG_VERSION,
    capabilities: CAPABILITY_REGISTRY.map((c) => ({
      id: c.id,
      binding: c.binding,
      summary: c.summary,
      llmHint: c.llmHint,
    })),
    templates: GUEST_TEMPLATE_IDS.map((id) => ({
      id,
      summary:
        id === "guest@v1"
          ? "Default guest shell: user JS in `body` runs inside async IIFE with optional capability shims."
          : `Guest template ${id}`,
    })),
    execute: {
      sandbox: {
        method: "POST",
        path: "/run",
        body: {
          body: "string (guest JavaScript); legacy alias: code",
          template: "optional string; default guest@v1",
          capabilities: "optional string[]; cap ids from capabilities[].id",
        },
      },
      kv: {
        method: "POST",
        path: "/run/kv",
        body: "same shape as sandbox; always includes kvRead snapshot",
      },
      chain: {
        method: "POST",
        path: "/run/chain",
        body: {
          steps:
            "array of { body (or code), template?, capabilities[], name?, props?, input? }; carry: input → else props → else previous output",
        },
      },
      spawn: {
        method: "POST",
        path: "/run/spawn",
        body: {
          body: "string (or code)",
          template: "optional",
          capabilities: "string[]",
          depth: "optional number",
        },
      },
      generate: {
        method: "POST",
        path: "/run/generate",
        body: {
          prompt: "string",
          capabilities: "string[]",
          template: "optional",
        },
      },
    },
    result: {
      get: "GET /results/:id",
      getJson: "GET /results/:id.json",
      note: "Use resultId from persisted run responses. `GET /results/:id.json` is the canonical machine-readable saved-result JSON. On the public app, `GET /results/:id` is the human viewer over that same saved result.",
    },
    seed: {
      method: "POST",
      path: "/seed",
      note: "Optional demo KV rows for kv.list exercises.",
    },
    healing: {
      diagnose: {
        method: "POST",
        path: "/diagnose",
        body: {
          traceId: "string - ID of a failed trace to analyze",
        },
        note: "Uses Workers AI to analyze a failed trace and return a structured diagnosis with problem category, hints, and confidence.",
      },
      propose: {
        method: "POST",
        path: "/propose",
        body: {
          diagnosis: "Diagnosis object - From /diagnose response",
        },
        note: "Given a diagnosis, the LLM suggests a fix (code change, capability change, input change, or template change).",
      },
      verify: {
        method: "POST",
        path: "/verify",
        body: {
          proposal: "FixProposal object - From /propose response",
          baseTraceId: "optional string - Original trace ID to inherit context from",
        },
        note: "Runs the proposed fix in a sandbox and returns a new trace with the result.",
      },
      compare: {
        method: "POST",
        path: "/compare",
        body: {
          a: "string - First trace ID (typically the failed one)",
          b: "string - Second trace ID (typically the fixed one)",
        },
        note: "Compares two traces and returns diffs for input, code, output, and errors with a summary.",
      },
    },
    stories: {
      create: {
        method: "POST",
        path: "/stories",
        body: {
          title: "string - Story title",
          traceIds: "string[] - Array of trace IDs to compose",
          createdBy: "optional string - Creator identifier",
          visibility: "optional string: private | team | public",
          tags: "optional string[] - Story tags",
        },
        note: "Create a new story from multiple traces. Each trace becomes a chapter with AI-generated summaries.",
      },
      get: {
        method: "GET",
        path: "/stories/:id",
        note: "Get story with all chapters including summaries and decision points.",
      },
      list: {
        method: "GET",
        path: "/stories",
        query: {
          createdBy: "optional string - Filter by creator",
          status: "optional string: in-progress | completed | failed | approved",
          visibility: "optional string: private | team | public",
          limit: "optional number - Max results",
          offset: "optional number - Skip results",
        },
        note: "List stories with optional filtering.",
      },
      fork: {
        method: "POST",
        path: "/stories/:id/fork",
        body: {
          fromChapterIndex: "number - Fork from this chapter index (inclusive)",
          newTitle: "optional string - Title for the forked story",
        },
        note: "Fork a story from a specific chapter, creating a new story with chapters up to that point.",
      },
      append: {
        method: "POST",
        path: "/stories/:id/append",
        body: {
          traceId: "string - Trace ID to append as new chapter",
        },
        note: "Add a new chapter (trace) to an existing story.",
      },
      updateStatus: {
        method: "PATCH",
        path: "/stories/:id/status",
        body: {
          status: "string: in-progress | completed | failed | approved",
        },
        note: "Update story status.",
      },
    },
  } as const
}
