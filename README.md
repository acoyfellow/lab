# Lab

**Receipts for agent work.**

Your agent runs code. Lab gives back a URL. The URL is the proof — readable by the next agent, verifiable by you.

LLMs do work, then describe what they did. The description is not the work. Lab runs the work in a sandbox and saves a canonical record at a URL: the agent that ran it can read its own receipt to retry or self-heal, the next agent can pick up from where the last one stopped, and a human can open the URL and see exactly what happened — without re-running anything.

One artifact. Two readers. Same source of truth.

**Try it now:** [lab.coey.dev/compose](https://lab.coey.dev/compose)

> **0.0.3** — API and result shapes may still move. Pin to exact versions or self-host.

---

## 2-Minute Quickstart

```bash
npm install @acoyfellow/lab
```

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL,  // or https://lab.coey.dev
});

// Run a chain, get a shareable result URL
const out = await lab.runChain([
  { name: "Load", body: `return { value: 42 }`, capabilities: [] },
  { name: "Double", body: `return { value: input.value * 2 }`, capabilities: [] },
]);

console.log(out.result);    // { value: 84 }
console.log(out.resultId);  // abc123

// Open the viewer: $LAB_URL/results/abc123
// Get the JSON: $LAB_URL/results/abc123.json
```

**What you'll see:**
1. **Code** — what ran in each step
2. **Capabilities** — what the code could access
3. **Result** — return values, timing, and any errors

---

## What Lab Does

Three things to know:

### The receipt
Every run saves canonical JSON at `/results/:id.json`, viewable at `/results/:id`. It includes the code, the inputs, the outputs, the timings, and any errors. The URL is the artifact.

### The loop
A step fails → the receipt includes the error → the agent reads its own receipt → patches → retries. No external memory, no shared database. The agent's last failure is the input to its next attempt.

### The handoff
Agent A finishes, returns a `resultId`. Agent B opens `/results/:id.json` and continues from there. The receipt is the entire interface between them.

---

## Common Patterns

These are the workflows agents build with Lab:

### Prove It Works
Ship agent code with proof it works.

```js
const out = await lab.runChain([
  { name: "Unit Tests", body: testCode, capabilities: [] },
  { name: "Integration", body: integrationCode, capabilities: ["kvRead"] },
]);
// Share the result URL → "10/10 tests passed"
```

### Self-Healing Pipeline
Auto-fix failures without human intervention.

```js
const steps = [
  { name: "Parse", body: `try { return JSON.parse(input.raw) } catch(e) { return { error: e.message } }`, capabilities: [] },
  { name: "Heal", body: `if (!input.error) return input; const fixed = input.raw.replace(/,(\s*[}\]])/g, '$1'); return JSON.parse(fixed);`, capabilities: [] },
];
```

### Agent Handoff
Multi-agent relay — each step can spawn the next.

```js
await lab.runChain([
  { name: "Planner", body: plannerCode, capabilities: ["workersAi"] },
  { name: "Coder", body: coderCode, capabilities: ["spawn"] },
  { name: "Reviewer", body: reviewerCode, capabilities: [] },
]);
```

### Canary Deploy
Compare old vs new logic before shipping.

```js
const [old, neu] = await Promise.all([
  lab.runSandbox({ body: oldLogic, capabilities: [] }),
  lab.runSandbox({ body: newLogic, capabilities: [] }),
]);
// Compare outputs, then decide
```

### Stress Test
Find breaking points.

```js
const runs = await Promise.all(
  Array.from({ length: 50 }, () =>
    lab.runSandbox({ body: targetCode, capabilities: [] })
  )
);
// Check which runs failed and why
```

See full patterns: [lab.coey.dev/docs/patterns](https://lab.coey.dev/docs/patterns)

---

## API Reference

### HTTP Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health check |
| `POST` | `/run` | Run code sandbox |
| `POST` | `/run/kv` | Run with `kvRead` capability |
| `POST` | `/run/chain` | Multi-step workflow |
| `POST` | `/run/spawn` | Nested isolates with depth budget |
| `POST` | `/run/generate` | AI-generated code + run |
| `POST` | `/seed` | Write demo KV data |
| `GET`  | `/lab/catalog` | Capability metadata for agents |
| `GET`  | `/results/:id` | Human viewer |
| `GET`  | `/results/:id.json` | Canonical result JSON |

### TypeScript Client

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "..." });

lab.runSandbox({ body, capabilities? })  // Single sandbox
lab.runKv({ body })                       // With KV snapshot
lab.runChain(steps)                       // Multi-step
lab.runSpawn({ body, capabilities?, depth? })  // Nested isolates
lab.runGenerate({ prompt, capabilities? })     // AI-generated code
lab.seed()                                // Seed demo data
lab.getResult(resultId)                   // Fetch saved result JSON
```

Effect client: `import { createLabEffectClient } from "@acoyfellow/lab/effect"`

---

## Capabilities

Each step only gets what you explicitly grant:

| Capability | What the guest gets |
|------------|---------------------|
| `kvRead` | Read-only KV: `kv.get(key)`, `kv.list(prefix)` |
| `workersAi` | `ai.run(prompt)` — keys stay on host |
| `r2Read` | `r2.list()`, `r2.getText(key)` |
| `d1Read` | `d1.query(sql)` — read-only queries |
| `spawn` | `spawn(code, caps)` — nested child isolates |
| `durableObjectFetch` | `labDo.fetch(name, { method, path, body })` |
| `containerHttp` | `labContainer.get(path)` — bound container service |

No capabilities = pure compute, no I/O. Denied capabilities produce clear errors in the saved result.

---

## MCP Integration

Give agents access to Lab via MCP:

```bash
npm install -g @acoyfellow/lab-mcp
```

```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": { "LAB_URL": "https://your-lab.example" }
    }
  }
}
```

Tools: `find` (discover capabilities, fetch results) and `execute` (run any mode).

---

## Self-Host

Your agents, your data, your capabilities:

```bash
git clone https://github.com/acoyfellow/lab.git && cd lab
bun install && bun run deploy
```

Requires Cloudflare Workers Paid ($5/mo). Provisions the public app, private Worker, auth D1, engine D1, KV, Worker Loader, Durable Objects, and optional R2/AI bindings via [Alchemy](https://github.com/sam-goodwin/alchemy).

---

## Project Structure

```
worker/              Sandbox engine (Effect v4, Worker Loaders)
  index.ts           Routes, chain/spawn orchestration, result storage
  Loader.ts          V8 sandbox lifecycle
  guest/templates.ts Guest module composition + capability shims
  capabilities/      Capability registry
packages/
  lab/               TypeScript client (@acoyfellow/lab)
  lab-mcp/           MCP server (@acoyfellow/lab-mcp)
  lab-cli/           CLI tools
  lab-petri/         Runtime utilities
src/                 SvelteKit app (compose, viewer, docs)
alchemy.run.ts       Infrastructure-as-code
```

---

## Development

```bash
bun dev        # Worker (port 1337) + SvelteKit app
bun test       # Guest body syntax validation
bun run lint   # oxlint
bun run check  # svelte-check + typecheck
```

Integration tests in `worker/index.test.ts` run against a live Worker.

---

## License

MIT
