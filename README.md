# Lab

Run JavaScript in isolated V8 engines on Cloudflare's edge. Each step gets explicit capabilities. Every run produces a shareable trace.

```
You send JS  →  Lab runs it in a fresh V8 isolate  →  You get the result + a trace URL
```

**Live demo:** [lab.coey.dev/compose](https://lab.coey.dev/compose) — run a chain, click the trace link, see what happened.

> **0.0.1** — API and trace shapes may still move. Fork and self-host, don't depend on semver yet.

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

console.log(out.result);  // [2, 4, 6]
console.log(out.traceId); // → "a1b2c3d4e5" → lab.coey.dev/t/a1b2c3d4e5
```

Each step runs in its own V8 isolate. Step 2 receives step 1's return value as `input`. The trace records every step's code, input, output, and timing.

## How it works

**Isolates** — each step spins up a fresh V8 via Cloudflare's [Worker Loaders](https://developers.cloudflare.com/workers/runtime-apis/loaders/). No shared state between steps. Nothing leaks.

**Capabilities** — a step can only access what you explicitly grant. No capabilities means pure compute, no I/O.

| Capability | What the guest gets |
|---|---|
| `kvRead` | `kv.get(key)` / `kv.list(prefix)` — read-only snapshot |
| `workersAi` | `ai.run(prompt)` — Workers AI, keys stay on host |
| `r2Read` | `r2.list()` / `r2.getText(key)` — R2 object storage |
| `d1Read` | `d1.query(sql)` — read-only D1 queries |
| `spawn` | `spawn(code, caps)` — nested child isolates with depth budget |
| `durableObjectFetch` | `labDo.fetch(name, path)` — stub Durable Object |
| `containerHttp` | `labContainer.get(path)` — bound container service |

If a step tries to use a capability it wasn't granted, it gets a clear denial recorded in the trace.

**Traces** — every run produces a durable JSON artifact at `/t/:id`. It contains the code that ran, the capabilities it had, what it returned, and how long it took. Share the URL. Inspect it. Fork it into a new run.

## API

### HTTP

| Method | Path | Body |
|---|---|---|
| `POST` | `/run` | `{ body, capabilities? }` |
| `POST` | `/run/kv` | same — always includes `kvRead` |
| `POST` | `/run/chain` | `{ steps: [{ body, capabilities, name? }] }` |
| `POST` | `/run/spawn` | `{ body, capabilities, depth? }` |
| `POST` | `/run/generate` | `{ prompt, capabilities }` |
| `POST` | `/seed` | `{}` — writes demo KV data |
| `GET` | `/lab/catalog` | — capability + route metadata for agents |
| `GET` | `/t/:id` | — trace JSON |

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

An Effect client is available at `@acoyfellow/lab/effect` — same API, returns `Effect` instead of `Promise`.

## Agent / MCP integration

Lab exposes two MCP tools: **`find`** (discover capabilities, fetch traces) and **`execute`** (run any mode).

```bash
npm install -g @acoyfellow/lab-mcp
```

Claude Desktop / Cursor config:

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

See [`packages/lab-mcp`](packages/lab-mcp) for details.

## Self-host

Deploy to your own Cloudflare account. You control the data, capabilities, and bindings.

```bash
git clone https://github.com/acoyfellow/lab.git
cd lab
bun install
bun run deploy
```

Requires a Cloudflare account (Workers Paid, $5/mo). The deploy script provisions KV, D1, R2, and the Worker via [Alchemy](https://github.com/sam-goodwin/alchemy). Full guide: [lab.coey.dev/docs/self-host](https://lab.coey.dev/docs/self-host).

## Project structure

```
worker/              Isolate engine (Effect v4 beta, Worker Loaders)
  index.ts           HTTP routes, chain/spawn orchestration, trace storage
  Loader.ts          V8 isolate lifecycle via Effect services
  guest/templates.ts Guest module composition + capability shims
  capabilities/      Capability registry
packages/lab/        TypeScript client (@acoyfellow/lab)
packages/lab-mcp/    MCP server (@acoyfellow/lab-mcp)
src/                 SvelteKit app (Compose, trace viewer, docs, tutorial)
alchemy.run.ts       Infrastructure-as-code (Cloudflare resources)
```

## Development

```bash
bun dev              # Start Worker (port 1337) + SvelteKit app
bun test             # Guest body syntax validation
bun run lint         # oxlint
bun run check        # svelte-check + typecheck packages
```

Integration tests in `worker/index.test.ts` run against a live Worker — they skip gracefully when no Worker is available. CI runs syntax tests, lint, and check on every PR.

## License

MIT