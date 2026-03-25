<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# HTTP API

Public Worker endpoints. Default origin in examples: `https://lab.coey.dev`. Capabilities: [how they work](/docs/capabilities).

## Run modes

| Mode | When | Endpoint |
|------|------|----------|
| Chain | Orchestration + per-step `trace` | `POST /run/chain` |
| Sandbox | Single isolate, no caps | `POST /run` |
| KV Read | Read-only KV snapshot | `POST /run/kv` |
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

KV (after `POST /seed`):

```
curl -X POST https://lab.coey.dev/run/kv \
  -H 'Content-Type: application/json' \
  -d '{"code":"const keys = await kv.list(\"user:\"); return keys;"}'
```

## `POST /run`

Sandboxed isolate, no capabilities.

**Body:** `{ code: string }`

**Response:** `{ ok: boolean, result }` or error shape with `reason`, `error`.

## `POST /run/kv`

**Body:** `{ code: string }`

In isolate: `kv.get`, `kv.list` against a snapshot loaded before the isolate runs.

## `POST /run/chain`

**Body:** `{ steps: Array<{ name?: string, code: string, capabilities: string[] }> }`

Each step receives the previous output as `input`. Optional per-step `name`.

**Response:** includes `trace` (per-step I/O, timing). Supported capability: `kvRead`.

Persisted runs return `traceId` for [GET /t/:id](/docs/trace-schema).

## `POST /run/generate`

**Body:** `{ prompt: string, capabilities: string[] }`

**Response:** `generated`, `generateMs`, `runMs`. Model: `@cf/meta/llama-3.1-8b-instruct`.

Add `kvRead` to capabilities to allow generated code KV access.

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
