# lab

Run sandboxed JavaScript on Cloudflare Workers at runtime. Control what each isolate can access using typed capabilities.

**Live:** https://lab.coy.workers.dev

## What this does

You send a string of JavaScript to a Cloudflare Worker. The Worker creates a V8 isolate and runs your code inside it. The isolate has no network access, no storage access, and no way to reach the outside world — unless you explicitly grant capabilities.

Capabilities are typed with [Effect](https://effect.website). If an isolate has `KvRead`, it can read from KV. If it doesn't, attempting to read throws. This is checked before the isolate runs, not after.

The project has five features, each building on the previous:

| Feature | What it does | Endpoint |
|---------|-------------|----------|
| **Sandbox** | Runs code with no capabilities | `POST /run` |
| **KV Read** | Grants read-only access to a KV namespace | `POST /run/kv` |
| **Chain** | Runs isolates in sequence, each with different capabilities | `POST /run/chain` |
| **Generate** | An LLM writes the code, then it runs in a sandboxed isolate | `POST /run/generate` |
| **Spawn** | An isolate creates child isolates with fewer capabilities | `POST /run/spawn` |

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

Each step receives the previous step's output as `input`. Each step declares which capabilities it needs. The response includes a `trace` array showing each step's input, output, and timing.

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

**Request body:** `{ steps: Array<{ code: string, capabilities: string[] }> }`

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
  index.ts        Worker entrypoint, routing, all endpoints
  Loader.ts       Isolate service, code wrapping, spawn outbound handler
  Capability.ts   KvRead service tag, CapabilitySet type
  ui.html         Web interface (no framework, no build step)
  env.d.ts        TypeScript module declaration for .html imports
wrangler.jsonc    Worker config: LOADER, KV, AI, SELF bindings
```

### Bindings

| Binding | Type | Purpose |
|---------|------|--------|
| `LOADER` | Worker Loader | Creates V8 isolates from code strings |
| `KV` | KV Namespace | Storage for demo data |
| `AI` | Workers AI | Code generation (phase 4) |
| `SELF` | Service Binding | Routes child spawn requests back to this worker |

### Dependencies

- `effect` — typed services, error handling, composition
- `@cloudflare/workers-types` — type definitions for Worker APIs
- `wrangler` — dev server and deploy tool
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
