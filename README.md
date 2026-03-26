# Lab

Isolated execution and traceable workflows for AI agents on Cloudflare's edge.

An agent sends code. Lab runs each step in a fresh V8 isolate with only the capabilities you grant. Every run produces a **trace** — a permanent, inspectable artifact that records what ran, what it returned, and how long it took.

The trace is the point. It's how agents prove what they did, hand off context to other agents, and let humans follow the story.

```
agent sends code  →  isolated execution  →  trace URL (permanent artifact)
```

**See a trace:** [lab.coey.dev/compose](https://lab.coey.dev/compose) — run a chain, click the trace link, follow the story.

> **0.0.1** — API and trace shapes may still move. Pin to exact versions or self-host.

## Why traces

An agent that runs code in a black box can only say "I think this worked." A trace proves it.

- **Proof of work** — the trace records every step's code, input, output, and timing. It's a receipt, not a claim.
- **Agent-to-agent handoff** — Agent A produces a trace URL. Agent B reads it and continues the work. The trace is the protocol.
- **Self-healing loops** — an agent runs a chain, reads the trace, sees the failure, patches the code, runs again. Each iteration is a new trace. You can watch an agent debug itself.
- **Human oversight** — share a trace URL. A person can follow exactly what happened, step by step, without needing the agent's context window.

## What agents build with this

**Self-healing data pipelines** — an agent chains steps that parse, validate, and repair broken data. When a step fails, the trace shows exactly what input caused it. The agent reads the trace, generates a fix, and runs again.

**Proof of correctness** — instead of "this should work," an agent specifies edge cases, runs the function against all of them in isolated steps, and returns a trace showing 10/10 passing. The trace IS the deliverable.

**Canary deployments** — old logic and new logic run against the same inputs in separate isolates. The trace diffs the outputs. An agent (or human) reviews the trace to decide if the change is safe to ship.

**Compute offload** — LLMs hallucinate math. An agent ships fibonacci, prime sieves, matrix operations to Lab isolates and gets exact answers with a trace proving the computation.

See all agent patterns: [lab.coey.dev/examples](https://lab.coey.dev/examples)

## Quickstart

```bash
npm install @acoyfellow/lab
```

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: "https://lab.coey.dev",
});

// Agent builds a self-healing chain:
// Step 1 loads broken data, Step 2 tries to parse it,
// Step 3 repairs it, Step 4 validates the fix.
const out = await lab.runChain([
  { name: "Load",    body: `return { raw: '{"users": [{"id": 1,}]}', attempt: 1 }`, capabilities: [] },
  { name: "Parse",   body: `try { return { ok: true, data: JSON.parse(input.raw) } } catch(e) { return { ok: false, error: e.message, raw: input.raw } }`, capabilities: [] },
  { name: "Heal",    body: `if (input.ok) return input; const fixed = input.raw.replace(/,(\\s*[}\\]])/g, '$1'); return { ok: true, data: JSON.parse(fixed), healed: true }`, capabilities: [] },
  { name: "Verify",  body: `return { valid: input.ok, healed: !!input.healed, users: input.data?.users?.length }`, capabilities: [] },
]);

console.log(out.result);   // { valid: true, healed: true, users: 1 }
console.log(out.traceId);  // → lab.coey.dev/t/<id> (the full story)
```

Each step runs in its own V8 isolate. Step 2's output flows to Step 3's `input`. The trace records every step — share the URL to show exactly what happened.

## How it works

**Isolates** — each step spins up a fresh V8 via Cloudflare [Worker Loaders](https://developers.cloudflare.com/workers/runtime-apis/loaders/). No shared state between steps. Nothing leaks. Step 1 can poison globals — Step 2 won't see any of it.

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

No capabilities = pure compute, no I/O. Denied capabilities produce clear errors recorded in the trace.

**Traces** — every run produces a durable artifact at `/t/:id`. Code, capabilities, return values, timing — all recorded. Share the URL. Inspect it. Fork it into a new run. Hand it to another agent or a human reviewer.

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

Lab exposes two MCP tools — **`find`** (discover capabilities, fetch traces) and **`execute`** (run any mode). Give an agent access to Lab and it can execute code, read traces, and build on previous runs.

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

Deploy to your own Cloudflare account. Your agents, your data, your capabilities.

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
