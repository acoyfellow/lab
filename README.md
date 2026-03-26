# Lab

Run JavaScript in isolated V8 engines on Cloudflare's edge. Each step gets explicit capabilities. Every run produces a shareable trace.

```
JS code  →  fresh V8 isolate  →  result + trace URL
```

**Try it live:** [lab.coey.dev/compose](https://lab.coey.dev/compose)

> **0.0.1** — API and trace shapes may still move. Pin to exact versions or self-host.

## Quickstart

```bash
npm install @acoyfellow/lab
```

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: "https://lab.coey.dev",  // or your own deploy
});

const out = await lab.runChain([
  { body: "return [1, 2, 3]", capabilities: [] },
  { body: "return input.map(n => n * 2)", capabilities: [] },
]);

console.log(out.result);   // [2, 4, 6]
console.log(out.traceId);  // "a1b2c3d4e5" → lab.coey.dev/t/a1b2c3d4e5
```

Step 2 receives step 1's return value as `input`. The trace records every step's code, input, output, and timing.

## How it works

**Isolates** — each step spins up a fresh V8 via Cloudflare [Worker Loaders](https://developers.cloudflare.com/workers/runtime-apis/loaders/). No shared state. Nothing leaks.

**Capabilities** — a step can only touch what you explicitly grant:

| Capability | What the guest gets |
|---|---|
| `kvRead` | `kv.get(key)` / `kv.list(prefix)` — read-only KV snapshot |
| `workersAi` | `ai.run(prompt)` — Workers AI (keys stay on host) |
| `r2Read` | `r2.list()` / `r2.getText(key)` — R2 object storage |
| `d1Read` | `d1.query(sql)` — read-only D1 queries |
| `spawn` | `spawn(code, caps)` — nested child isolates with depth budget |
| `durableObjectFetch` | `labDo.fetch(name, path)` — stub Durable Object |
| `containerHttp` | `labContainer.get(path)` — bound container service |

No capabilities = pure compute, no I/O. Denied capabilities produce clear errors in the trace.

**Traces** — every run produces a durable artifact at `/t/:id`. Code, capabilities, return values, timing — all recorded. Share the URL, inspect it, fork it into a new run.

## API

### HTTP routes

| Method | Path | Body |
|---|---|---|
| `POST` | `/run` | `{ body, capabilities? }` |
| `POST` | `/run/kv` | same — always includes `kvRead` |
| `POST` | `/run/chain` | `{ steps: [{ body, capabilities, name? }] }` |
| `POST` | `/run/spawn` | `{ body, capabilities, depth? }` |
| `POST` | `/run/generate` | `{ prompt, capabilities }` |
| `POST` | `/seed` | `{}` — writes demo KV data |
| `GET` | `/lab/catalog` | capability + route metadata for agents |
| `GET` | `/t/:id` | trace JSON |

### TypeScript client

```bash
npm install @acoyfellow/lab
```

| Method | What it does |
|---|---|
| `runSandbox(payload)` | Single isolate run |
| `runKv(payload)` | Run with KV snapshot |
| `runChain(steps)` | Multi-step pipeline |
| `runSpawn(payload)` | Nested isolates |
| `runGenerate(payload)` | AI-generated code + run |
| `seed()` | Seed demo KV data |
| `getTrace(traceId)` | Fetch a stored trace |

Effect client: `import { createLabEffectClient } from "@acoyfellow/lab/effect"` — same API, returns `Effect` instead of `Promise`.

## MCP integration

Lab exposes two MCP tools — **`find`** (discover capabilities, fetch traces) and **`execute`** (run any mode).

```bash
npm install -g @acoyfellow/lab-mcp
```

```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": { "LAB_URL": "https://your-lab.workers.dev" }
    }
  }
}
```

Works with Claude Desktop, Cursor, or any MCP client. See [`packages/lab-mcp`](packages/lab-mcp).

## Self-host

Deploy to your own Cloudflare account. You control the data, capabilities, and bindings.

```bash
git clone https://github.com/acoyfellow/lab.git && cd lab
bun install && bun run deploy
```

Requires Cloudflare Workers Paid ($5/mo). Provisions KV, D1, R2, and the Worker via [Alchemy](https://github.com/sam-goodwin/alchemy).

## Project structure

```
worker/              Isolate engine (Effect v4, Worker Loaders)
  index.ts           Routes, chain/spawn orchestration, trace storage
  Loader.ts          V8 isolate lifecycle
  guest/templates.ts Guest module composition + capability shims
  capabilities/      Capability registry
packages/lab/        TypeScript client (@acoyfellow/lab)
packages/lab-mcp/    MCP server (@acoyfellow/lab-mcp)
src/                 SvelteKit app (compose, trace viewer, docs)
alchemy.run.ts       Infrastructure-as-code
```

## Development

```bash
bun dev              # Worker (port 1337) + SvelteKit app
bun test             # Guest body syntax validation
bun run lint         # oxlint
bun run check        # svelte-check + typecheck
```

Integration tests in `worker/index.test.ts` run against a live Worker and skip gracefully when unavailable.

## License

MIT
