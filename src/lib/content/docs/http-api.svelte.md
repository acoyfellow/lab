<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# HTTP API

Public Worker endpoints. Default origin in examples: `https://lab.coey.dev`. Capabilities: [how they work](/docs/capabilities).

## Run modes

| Mode | When | Endpoint |
|------|------|----------|
| Chain | Orchestration + per-step `trace` | `POST /run/chain` |
| Sandbox | Single isolate; optional `capabilities[]` | `POST /run` |
| KV Read | KV snapshot + optional extra `capabilities[]` | `POST /run/kv` |
| Generate | LLM writes code, then runs | `POST /run/generate` |
| Spawn | Child isolates (bounded depth) | `POST /run/spawn` |

## Examples (curl)

Chain:

```
curl -X POST https://lab.coey.dev/run/chain \
  -H 'Content-Type: application/json' \
  -d '{"steps":[{"code":"return [1, 2, 3]","capabilities":[]}, ...]}'
```

Sandbox:

```
curl -X POST https://lab.coey.dev/run \
  -H 'Content-Type: application/json' \
  -d '{"code":"return { sum: [1,2,3].reduce((a,b)=>a+b, 0) }"}'
```

Optional guest capabilities:

```
curl -X POST https://lab.coey.dev/run \
  -H 'Content-Type: application/json' \
  -d '{"code":"return await d1.query(\"SELECT 1 as n\")","capabilities":["d1Read"]}'
```

KV (after `POST /seed`):

```
curl -X POST https://lab.coey.dev/run/kv \
  -H 'Content-Type: application/json' \
  -d '{"code":"const keys = await kv.list(\"user:\"); return keys;"}'
```

## `POST /run`

Sandboxed isolate. Optional guest shims via `capabilities`.

**Body:** `{ code: string, capabilities?: string[] }`

See [Capabilities](/docs/capabilities) for `kvRead`, `workersAi`, `r2Read`, `d1Read`, `durableObjectFetch`, `containerHttp`.

**Response:** `{ ok: boolean, result }` or error shape with `reason`, `error`.

## `POST /run/kv`

**Body:** `{ code: string, capabilities?: string[] }`

Always includes `kvRead`. Merges any extra capability strings from `capabilities`.

In isolate: `kv.get`, `kv.list` against a snapshot loaded before the isolate runs.

## `POST /run/chain`

**Body:** `{ steps: Array<{ name?: string, code: string, capabilities: string[] }> }`

Each step receives the previous output as `input`. Optional per-step `name`.

**Response:** includes `trace` (per-step I/O, timing). Per-step `capabilities` may include any catalog string.

Persisted runs return `traceId` for [GET /t/:id](/docs/trace-schema).

## `POST /run/generate`

**Body:** `{ prompt: string, capabilities: string[] }`

**Response:** `generated`, `generateMs`, `runMs`. Model: `@cf/meta/llama-3.1-8b-instruct`.

Include capability strings so the system prompt lists the matching guest APIs (`kvRead`, `workersAi`, etc.).

## Internal invoke (not for direct integration)

Guest code with host-invoke caps calls `fetch("http://internal/invoke/...")` routed via `SELF`. Routes: `/invoke/ai`, `/invoke/r2`, `/invoke/d1`, `/invoke/do`, `/invoke/container`.

## `POST /run/spawn`

**Body:** `{ code: string, capabilities: string[], depth?: number }`

In isolate: `spawn(code, capabilities)`. Default `depth`: 2; at 0, spawn throws.

**Internal:** `POST /spawn/child` — not called directly by clients.

## `POST /seed`

Seeds KV with demo data. No trace id.

## `GET /t/:id`

Persisted trace document. Same JSON as `GET /t/:id.json`. Shape: [Trace schema](/docs/trace-schema).

---

<DocFooterNav
  gridClass="sm:grid-cols-2"
  links={[
    { label: 'Docs', to: '/docs', description: 'Hub for all on-site reference pages.' },
    { label: 'TypeScript client', to: '/docs/typescript', description: 'npm package, createLabClient, methods.' },
  ]}
/>
