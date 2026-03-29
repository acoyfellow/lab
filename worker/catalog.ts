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
  } as const
}
