<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# Trace document schema

JSON returned by `GET /t/:id` (Worker or app) and `GET /t/:id.json`. Authoring source: `src/lib/content/docs/trace-schema.svelte.md` in the repo (same content as this page).

Traces are stored in KV under `trace:<id>` and returned by:

- `GET /t/:id` (JSON body, Worker or app proxy)
- `GET /t/:id.json` (SvelteKit, same JSON)

`id` is a short alphanumeric string (10 hex chars from a UUID slice).

## Top-level object (`StoredTrace`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Trace id (same as URL segment) |
| `type` | `"sandbox"` \| `"kv"` \| `"chain"` \| `"generate"` \| `"spawn"` | Run mode |
| `createdAt` | string | ISO 8601 timestamp |
| `request` | object | Inputs (shape varies by `type`) |
| `outcome` | object | `ok`, optional `result`, `error`, `reason` |
| `timing` | object? | `totalMs`, optional `generateMs`, `runMs` |
| `generated` | string? | Normalized code (generate mode) |
| `trace` | array? | Per-step execution trace (chain mode) |

## `request` by type

- **sandbox:** `{ code?, capabilities? }` (capabilities often `[]`)
- **kv:** `{ code, capabilities: ["kvRead"] }`
- **chain:** `{ steps: { name?, code, capabilities[] }[] }`
- **generate:** `{ prompt, capabilities[] }`
- **spawn:** `{ code, capabilities[], depth? }`

## `trace` entry (chain execution)

Each element:

| Field | Type |
|-------|------|
| `step` | number (0-based) |
| `name` | string? |
| `capabilities` | string[] |
| `input` | unknown |
| `output` | unknown |
| `ms` | number |

## Run response (POST bodies)

Successful run endpoints include `traceId` in the JSON response alongside mode-specific fields (`result`, `trace`, `generated`, etc.). Failed runs that go through trace persistence also return `traceId`.

`POST /seed` does not create a trace.

---

<DocFooterNav
  gridClass="sm:grid-cols-2 lg:grid-cols-3"
  links={[
    { label: 'Examples', to: '/examples', description: 'Runnable demos and bookmarkable trace URLs.' },
    { label: 'Compose', to: '/compose', description: 'Run modes in the browser against the Worker.' },
    { label: 'Docs', to: '/docs', description: 'Hub for HTTP API, architecture, TypeScript, capabilities.' },
  ]}
/>
