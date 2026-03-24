# lab

**Primitives for orchestration of bounded, traceable compute** on [Cloudflare Workers](https://workers.cloudflare.com/). Built for **builders** shipping agents, tools, and backends who need **sandboxed isolates**, **explicit capabilities** (least privilege), and a **durable, shareable trace** of what actually ran.

**Live:** https://lab.coy.workers.dev

## Why come back here

1. **Compose** — Run **chains** of isolates: each step gets the previous step’s output as `input`, with its own capability set.
2. **Run** — Code executes in a fresh V8 isolate per step; no network unless you grant it.
3. **Share the trace** — Successful runs return a **`traceId`**; open **`/t/{id}`** for code, capabilities, per-step I/O, timing, and a stable URL you can paste into tickets or docs.

That loop (compose → run → trace URL) is the product shape. The web UI is optimized for **chains first**; other modes are still available for single-shot experiments.

Capabilities are typed with [Effect](https://effect.website). If an isolate does not have `KvRead`, any `kv` access fails **before** execution. This is static checking of the capability set, not runtime probing.

## Habit loop (today) and what’s next

| Stage | What it gives you |
|-------|-------------------|
| **Trace** (now) | Shareable record: request, outcome, timing, per-step trace for chains |
| **Compose** (now) | Multi-step flows with different capabilities per step |
| **Fork / remix** (later) | Branch from a trace or saved flow — not shipped in this repo yet |
| **Saved recipes** (later) | Named, loadable playbooks in storage — not shipped yet |

## Run modes

Each mode maps to an HTTP endpoint. Use **Chain** when you need **orchestration + a trace**; use the others for focused demos or API integration.

| Mode | When to use it | Endpoint |
|------|----------------|----------|
| **Chain** | Multi-step pipeline, different caps per step, full `trace` array | `POST /run/chain` |
| **Sandbox** | Single isolate, no capabilities | `POST /run` |
| **KV Read** | Single isolate with read-only KV snapshot | `POST /run/kv` |
| **Generate** | LLM writes code, then runs it in a sandboxed isolate | `POST /run/generate` |
| **Spawn** | Parent isolate creates child isolates (bounded depth) | `POST /run/spawn` |

---

## How to run a chain

```bash
curl -X POST https://lab.coy.workers.dev/run/chain \
  -H 'Content-Type: application/json' \
  -d '{
    "steps": [
      { "code": "return [1, 2, 3]", "capabilities": [] },
      { "code": "return input.map(n => n * n)", "capabilities": [] },
      { "code": "return { squares: input, total: input.reduce((a,b)=>a+b,0) }", "capabilities": [] }
    ]
  }'
```

Optional per-step **`name`** is accepted for documentation and traces. Each step receives the previous step’s output as `input`. The response includes a **`trace`** array (per-step input, output, timing) and, when persisted, a **`traceId`** for **`GET /t/{id}`**.

---

## How to run a sandboxed isolate

```bash
curl -X POST https://lab.coy.workers.dev/run \
  -H 'Content-Type: application/json' \
  -d '{"code": "return { sum: [1,2,3].reduce((a,b) => a+b, 0) }"}'
```

Response:

```json
{ "ok": true, "result": { "sum": 6 } }
```

The code runs inside `await (async () => { <your code> })()`. Use `return` to produce output. The isolate cannot make network requests (`globalOutbound` is `null`).

## How to read from KV

```bash
# Seed demo data first
curl -X POST https://lab.coy.workers.dev/seed

# Run code with KV Read capability
curl -X POST https://lab.coy.workers.dev/run/kv \
  -H 'Content-Type: application/json' \
  -d '{"code": "const keys = await kv.list(\"user:\"); return keys;"}'
```

Inside the isolate, `kv.get(key)` and `kv.list(prefix?)` are available. The KV data is snapshot before the isolate starts — the isolate reads from an in-memory copy, not from KV directly.

## How to generate code with AI

```bash
curl -X POST https://lab.coy.workers.dev/run/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Return the first 10 prime numbers as an array",
    "capabilities": []
  }'
```

The response includes `generated` (the code the LLM wrote), `generateMs` (how long generation took), and `runMs` (how long execution took). Add `"kvRead"` to `capabilities` to give the generated code KV access.

## How to spawn child isolates

```bash
curl -X POST https://lab.coy.workers.dev/run/spawn \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "const a = await spawn(\"return 10 * 10\", []); const b = await spawn(\"return 20 * 20\", []); return { a, b }",
    "capabilities": ["spawn"],
    "depth": 2
  }'
```

Inside the isolate, `spawn(code, capabilities)` creates a child isolate. The `depth` parameter decrements with each level. At depth 0, `spawn` is no longer available — this prevents unbounded recursion structurally, not by quota.

---

## API reference

### `POST /run`

Run code in a sandboxed isolate with no capabilities.

**Request body:** `{ code: string }`

**Response:** `{ ok: boolean, result: any }` or `{ ok: false, reason: string, error: string }`

### `POST /run/kv`

Run code with KV Read capability.

**Request body:** `{ code: string }`

**Available in isolate:** `kv.get(key: string): Promise<string | null>`, `kv.list(prefix?: string): Promise<string[]>`

### `POST /run/chain`

Run a sequence of isolates. Each step's output becomes the next step's `input`.

**Request body:** `{ steps: Array<{ name?: string, code: string, capabilities: string[] }> }`

**Response:** `{ ok: boolean, result: any, trace: Array<{ step: number, capabilities: string[], input: any, output: any, ms: number }> }`

**Supported capabilities:** `"kvRead"`

### `POST /run/generate`

Generate code from a natural language prompt using Workers AI, then run it.

**Request body:** `{ prompt: string, capabilities: string[] }`

**Response:** `{ ok: boolean, result: any, generated: string, generateMs: number, runMs: number }`

**Model:** `@cf/meta/llama-3.1-8b-instruct`

### `POST /run/spawn`

Run code with the ability to spawn child isolates.

**Request body:** `{ code: string, capabilities: string[], depth?: number }`

**Available in isolate:** `spawn(code: string, capabilities: string[]): Promise<any>`

**Default depth:** 2. Children receive `depth - 1`. At depth 0, `spawn` throws.

### `POST /seed`

Seeds KV with demo data (3 users + 1 config entry).

### `POST /spawn/child`

Internal route used by child isolates. Not called directly.

---

## How capabilities work

Capabilities control what code can do inside an isolate. They are implemented as shims injected into the isolate's wrapper code at spawn time.

**Without a capability:** The API (e.g. `kv`) is a `Proxy` that throws on any property access. The isolate gets a clear error: `"KvRead capability not granted"`.

**With a capability:** The API works against data prepared by the parent. For KV Read, the parent snapshots all KV data into memory and injects it as JSON. The isolate reads from that snapshot — it never makes outbound requests.

**Spawn capability:** Uses a `SELF` service binding in `wrangler.jsonc`. The isolate's `globalOutbound` points back to the parent worker. When the isolate calls `spawn()`, it makes a fetch request that routes to `POST /spawn/child`, which creates a new isolate. Depth decrements each level. At depth 0, the spawn shim throws instead of making a request.

**Why snapshot KV instead of passing the binding?** `KVNamespace` cannot be serialized into a Worker Loader's `env`. The runtime throws `"Could not serialize object of type KvNamespace"`. Snapshotting solves this — the isolate gets the data without needing the binding.

For more on the architecture decisions, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Project structure

```
src/
  routes/           SvelteKit UI (home, trace viewer, auth)
  lib/              Auth client, schemas
worker/
  index.ts          Worker entrypoint, routing, traces
  Loader.ts         Isolate service, spawn outbound
  Capability.ts     KvRead tag, CapabilitySet
alchemy.run.ts      Alchemy deploy config
wrangler.jsonc      Worker bindings: LOADER, KV, AI, SELF
```

### Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `LOADER` | Worker Loader | Creates V8 isolates from code strings |
| `KV` | KV Namespace | Demo data + trace storage |
| `AI` | Workers AI | Code generation |
| `SELF` | Service Binding | Child spawn requests |

### Dependencies

- `effect` — typed services, error handling, composition
- `@cloudflare/workers-types` — Worker API types
- `wrangler` — dev and deploy
- `typescript` — type checking

---

## Deploy

```bash
bun install
bun run deploy
```

Or push to `main` — GitHub Actions deploys automatically.

## Development

```bash
bun install
bunx wrangler dev --port 8787
```

## Type check

```bash
bunx tsc --noEmit
```
