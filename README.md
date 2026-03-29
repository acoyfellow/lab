# Lab

The feedback loop for AI agents.

An agent writes code. Lab runs it in a sandbox and returns a **trace** — a full record of what happened. The agent reads the trace, fixes what broke, and runs again. Same loop a developer uses, except the agent does it.

```
agent writes code  →  Lab runs it  →  trace (what happened)  →  agent reads, fixes, reruns
```

**Try it now:** [lab.coey.dev/compose](https://lab.coey.dev/compose) — run a chain, click the trace link.

> **0.0.2** — API and trace shapes may still move. Pin to exact versions or self-host.

## Quickstart

```bash
npm install @acoyfellow/lab
```

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL,  // your Lab instance URL
});

// Self-healing pipeline: load broken JSON → try parse → heal → validate
const out = await lab.runChain([
  { name: "Load",    body: `return { raw: '{"users": [{"id": 1,}]}', attempt: 1 }`, capabilities: [] },
  { name: "Parse",   body: `try { return { ok: true, data: JSON.parse(input.raw) } } catch(e) { return { ok: false, error: e.message, raw: input.raw } }`, capabilities: [] },
  { name: "Heal",    body: `if (input.ok) return input; const fixed = input.raw.replace(/,(\\s*[}\\]])/g, '$1'); return { ok: true, data: JSON.parse(fixed), healed: true }`, capabilities: [] },
  { name: "Verify",  body: `return { valid: input.ok, healed: !!input.healed, users: input.data?.users?.length }`, capabilities: [] },
]);

console.log(out.result);   // { valid: true, healed: true, users: 1 }
console.log(out.traceId);  // → $LAB_URL/t/<id> (the receipt)
```

Each step runs in its own sandbox. Step 2's output flows to Step 3's `input`. The trace records everything — share the URL to show exactly what happened.

## Patterns

These are the workflows agents build with Lab. Every pattern produces a trace. The trace is always the point.

| Pattern | What happens | The trace proves |
|---|---|---|
| **[Prove It](https://lab.coey.dev/docs/patterns#prove-it)** | Agent writes code + edge cases, runs them all | 10/10 pass — the receipt |
| **[Self-Healing](https://lab.coey.dev/docs/patterns#self-healing-loop)** | Step fails → agent reads trace → patches → retries | The full reasoning chain |
| **[Agent Handoff](https://lab.coey.dev/docs/patterns#agent-handoff)** | Agent A → B → C, one chain | Who did what |
| **[Canary Deploy](https://lab.coey.dev/docs/patterns#canary-deploy)** | Old vs new logic, same inputs | What changed |
| **[Compute Offload](https://lab.coey.dev/docs/patterns#compute-offload)** | Ship math to a sandbox | Exact answer, no hallucination |
| **[Zero Bleed](https://lab.coey.dev/docs/patterns#zero-bleed-isolation-proof)** | Poison globals in step 1, step 2 is clean | Isolation works |

See all patterns: [lab.coey.dev/docs/patterns](https://lab.coey.dev/docs/patterns)

## How it works

**Workflows** — chain JavaScript steps together. Each step's return value becomes the next step's `input`. Each step runs in its own V8 sandbox via Cloudflare [Worker Loaders](https://developers.cloudflare.com/workers/runtime-apis/loaders/). Nothing leaks between steps.

**Capabilities** — each step can only access what you explicitly grant:

| Capability | What the guest gets |
|---|---|
| `kvRead` | `kv.get(key)` / `kv.list(prefix)` — read-only KV snapshot |
| `workersAi` | `ai.run(prompt)` — Workers AI (keys stay on host) |
| `r2Read` | `r2.list()` / `r2.getText(key)` — R2 object storage |
| `d1Read` | `d1.query(sql)` — read-only D1 queries |
| `spawn` | `spawn(code, caps)` — nested child isolates with depth budget |
| `durableObjectFetch` | `labDo.fetch(name, { method, path, body })` — Durable Object RPC |
| `containerHttp` | `labContainer.get(path)` — bound container service |

No capabilities = pure compute, no I/O. Denied capabilities produce clear errors recorded in the trace.

**Traces** — every run produces a durable artifact at `/t/:id`. Code, capabilities, return values, timing — all recorded. Share the URL. Fork it into a new run. Hand it to another agent.

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
| `runSandbox(payload)` | Single sandbox run |
| `runKv(payload)` | Run with KV snapshot |
| `runChain(steps)` | Multi-step workflow |
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
worker/              Sandbox engine (Effect v4, Worker Loaders)
  index.ts           Routes, chain/spawn orchestration, trace storage
  Loader.ts          V8 sandbox lifecycle
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
