<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# HTTP API

Public Worker endpoints (examples default to `https://lab.coey.dev`). Related: [Capabilities](/docs/capabilities) · [Limits](/docs/limits) · [Failures](/docs/failures) · [Security](/docs/security).

Guest **`body`** strings are plain **JavaScript** (inserted into template `guest@v1`), not TypeScript. **`code`** is accepted as a legacy alias for **`body`**. Optional **`template`**: only `guest@v1` today (default when omitted). The Worker **parses** each body as script (same shaped test as [`src/lib/guest-code.test.ts`](https://github.com/acoyfellow/lab/blob/main/src/lib/guest-code.test.ts)) before load; syntax errors fail the run with a **runtime** isolate error.

## Run modes

| Mode | When | Endpoint |
|------|------|----------|
| Chain | Orchestration + per-step `trace` | `POST /run/chain` |
| Sandbox | Single isolate; optional `capabilities[]` | `POST /run` |
| KV Read | KV snapshot + optional extra `capabilities[]` | `POST /run/kv` |
| Generate | LLM writes **body**, then runs | `POST /run/generate` |
| Spawn | Child isolates (bounded depth) | `POST /run/spawn` |

## Public HTTP (summary)

| Method | Path | Body (JSON) |
|--------|------|-------------|
| GET | `/health` | — health check |
| POST | `/run` | `{ body, template?, capabilities? }` or `{ code, … }` |
| POST | `/run/kv` | same as `/run` |
| POST | `/run/chain` | `{ steps: [{ body, template?, capabilities, name?, props?, input? }] }` |
| POST | `/run/spawn` | `{ body, template?, capabilities[], depth? }` |
| POST | `/run/generate` | `{ prompt, capabilities[], template? }` |
| POST | `/seed` | (empty) |
| GET | `/t/:id` | — trace document |
| GET | `/t/:id.json` | — same JSON as `/t/:id` (Worker + app) |
| GET | `/lab/catalog` | — machine-readable caps, templates, execute map (agents) |

## Examples (curl)

Chain:

```
curl -X POST https://lab.coey.dev/run/chain \\
  -H 'Content-Type: application/json' \\
  -d '{"steps":[{"body":"return [1, 2, 3]","capabilities":[]}, ...]}'
```

Sandbox:

```
curl -X POST https://lab.coey.dev/run \\
  -H 'Content-Type: application/json' \\
  -d '{"body":"return { sum: [1,2,3].reduce((a,b)=>a+b, 0) }"}'
```

Optional guest capabilities:

```
curl -X POST https://lab.coey.dev/run \\
  -H 'Content-Type: application/json' \\
  -d '{"body":"return await d1.query(\\\"SELECT 1 as n\\\")","capabilities":["d1Read"]}'
```

KV (after `POST /seed`):

```
curl -X POST https://lab.coey.dev/run/kv \\
  -H 'Content-Type: application/json' \\
  -d '{"body":"const keys = await kv.list(\\\"user:\\\"); return keys;"}'
```

## `POST /run`

Sandboxed isolate. Optional guest shims via `capabilities`.

**Body:** `{ body: string, template?: string, capabilities?: string[] }` — or **`code`** instead of **`body`**.

See [Capabilities](/docs/capabilities) for `kvRead`, `workersAi`, `r2Read`, `d1Read`, `durableObjectFetch`, `containerHttp`.

**Response:** `{ ok: boolean, result }` or error shape with `reason`, `error`.

## `POST /run/kv`

**Body:** same as `/run`.

Always includes `kvRead`. Merges any extra capability strings from `capabilities`.

In isolate: `kv.get`, `kv.list` against a snapshot loaded before the isolate runs.

## `POST /run/chain`

**Body:** `{ steps: Array<{ name?: string, body: string, template?: string, capabilities: string[], props?: unknown, input?: unknown }> }`

`code` is accepted per step instead of `body`. Each step receives **`input`** as: `step.input` if set, else `step.props` if set, else the previous step’s output.

**Response:** includes `trace` (per-step I/O, timing).

Persisted runs return `traceId` for [GET /t/:id](/docs/trace-schema).

## `POST /run/generate`

**Body:** `{ prompt: string, capabilities: string[], template?: string }`

**Response:** `generated`, `generateMs`, `runMs`. Model: `@cf/meta/llama-3.1-8b-instruct`.

Include capability strings so the system prompt lists matching guest APIs.

## Internal invoke (not for direct integration)

Guest code with host-invoke caps calls `fetch("http://internal/invoke/...")` routed via `SELF`. Routes: `/invoke/ai`, `/invoke/r2`, `/invoke/d1`, `/invoke/do`, `/invoke/container`.

## `POST /run/spawn`

**Body:** `{ body: string, capabilities: string[], template?: string, depth?: number }`

In isolate: `spawn(bodyString, capabilities)`. Default `depth`: 2; at 0, spawn throws.

**Internal:** `POST /spawn/child` — same JSON shape (`body` / legacy `code`, `template`, `capabilities`, `depth`).

## `POST /seed`

Seeds KV with demo data. No trace id.

## `GET /lab/catalog`

JSON for **LLM / tool** discovery: `capabilities` (with `llmHint`), `templates`, `execute` (which path for sandbox / chain / …), `trace`, `seed`. Same CORS as other public routes. Site origin can proxy this path to the Worker. Details: [Agents](/docs/agent-integration).

## `GET /t/:id` and `GET /t/:id.json`

Persisted trace document. Both paths return the same JSON. On the **Worker** (e.g. `http://localhost:1337`), `.json` exists for parity with the SvelteKit route [`/t/[id].json`](https://github.com/acoyfellow/lab/blob/main/src/routes/t/%5Bid%5D.json/%2Bserver.ts). Shape: [Trace schema](/docs/trace-schema).


<DocFooterNav
  gridClass="sm:grid-cols-2"
  links={[
    { label: 'Docs', to: '/docs', description: 'Hub for all on-site reference pages.' },
    { label: 'Agents', to: '/docs/agent-integration', description: 'MCP find + execute, or HTTP catalog + runs.' },
    { label: 'TypeScript client', to: '/docs/typescript', description: 'npm package, createLabClient, methods.' },
  ]}
/>
