# Using Lab from an agent

Lab works with any agent that can make HTTP requests or use MCP tools. Here's how to connect.

## MCP (recommended for Cursor, Claude Code, etc.)

The `@acoyfellow/lab-mcp` package gives your agent three tools:

- **`find`** — browse available permissions, look up past run results, or explore the API
- **`execute`** — run code in a sandbox, run multi-step pipelines, generate code from a prompt
- **`session`** — create/list/fetch sessions and update their continuation summary
- **`receipt`** — save proof for external work such as MCP calls, browser sessions, long-running task checkpoints, and handoffs

### Setup

```bash
npm install -g @acoyfellow/lab-mcp
```

Set `LAB_URL` to your Lab app origin (for example, the public app URL from your self-hosted deploy).

**Cursor:** merge the example config from [`docs/cursor-mcp-lab.example.json`](https://github.com/acoyfellow/lab/blob/main/docs/cursor-mcp-lab.example.json) into your MCP settings. Update `--cwd` to point to your clone.

**From the repo:** `bun run mcp:lab` starts the MCP server over stdio.

## TypeScript client

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL ?? "$LAB_URL",
});

// Run a single piece of code
const result = await lab.runSandbox({ body: "return 1 + 1" });

// Run a multi-step pipeline
const chain = await lab.runChain([
  { body: "return [1, 2, 3]", capabilities: [] },
  { body: "return input.map(n => n * n)", capabilities: [] },
]);
```

An [Effect](https://effect.website) variant is also available — `import { createLabEffectClient } from "@acoyfellow/lab/effect"`.

## Plain HTTP

Any agent that can make HTTP requests can use Lab directly against the public app origin:

```bash
curl -X POST $LAB_URL/run \
  -H 'Content-Type: application/json' \
  -d '{"body": "return 1 + 1"}'
```

See [HTTP API](/docs/http-api) for all endpoints.

## Auto-discovery

`GET /lab/catalog` returns a machine-readable JSON document describing all available capabilities, endpoints, and how to call them. Point your agent at this URL instead of hardcoding API details.

After a persisted run, agents should fetch `GET /results/:id.json`. `GET /results/:id` is the human viewer on the public app.

## Receipting MCP and long-running work

Use `receipt` when useful work happened outside Lab's sandbox — MCP tool calls, browser actions, long-running rig sessions, anything where the proof shouldn't live only in chat memory.

### Worked example: the-machine

[`the-machine`](https://github.com/acoyfellow/lab/blob/main/.context/machine-mcp.ts) is a durable background rig worker that drives an LLM against an objective for N sessions, writing per-run markdown to `.context/runs/`. Each session checkpoint is a natural place to persist a Lab receipt so another agent (or the operator, days later) can resume from evidence rather than chat:

```json
{
  "source": "the-machine",
  "action": "machine_start",
  "capabilities": ["filesystem.write", "process.spawn"],
  "input": {
    "name": "portfolio-loop",
    "objective": "Stage framework-evals prompt bundle",
    "max": 3,
    "model": "openai/gpt-5.5"
  },
  "output": {
    "session": 1,
    "status": "DONE",
    "runFile": ".context/runs/2026-04-28-e6-step2-staged-prompts-bundle.md"
  },
  "replay": {
    "mode": "continue-from-here",
    "available": true
  }
}
```

Pair the receipt with a session so the trail has a goal, not just a list of events:

```js
const session = await lab.createSession({
  title: "E6 step 2: staged prompts bundle",
  artifact: { repo: "a0", branch: "main" },
});

const receipt = await lab.createSessionReceipt(session.sessionId, {
  source: "the-machine",
  action: "machine_start",
  capabilities: ["filesystem.write", "process.spawn"],
  input: { name: "portfolio-loop", max: 3, objective: "..." },
  output: { session: 1, status: "DONE", runFile: ".context/runs/..." },
  replay: { mode: "continue-from-here", available: true },
});

// After each rig session completes, refresh the summary
await lab.updateSessionSummary(session.sessionId, {
  goal: "Stage framework-evals prompt bundle",
  state: "Session 1 done; staging tree validates against a0 prepush gates",
  nextAction: "Run framework-evals fetch wiring (step 3)",
  risks: ["no-secrets gate may flag the word 'Cloudflare' in the judge prompt"],
  importantReceiptIds: [receipt.resultId],
  updatedByReceiptId: receipt.resultId,
});
```

### What gets recorded

| Field | Why it matters |
|---|---|
| `source` | The system that did the work (`the-machine`, `cf-portal`, `playwright`, `codex`, etc.). Lets the next agent filter by origin. |
| `action` | The exact tool name. For the-machine: `machine_start`, `machine_stop`, `machine_status` — match the MCP tool you actually called. |
| `capabilities` | The host privileges the worker held. Filesystem writes, process spawns, network egress — anything the next agent needs to know about the authority used. |
| `input` / `output` | The arguments and the result. Keep it compact; large blobs go in the local rig receipt and you reference its path here. |
| `replay.mode` | `inspect-only` for read-only lookups; `continue-from-here` when the next agent is meant to pick up where this one stopped. |

For agents, the main next step is rarely a literal replay. It's **continuation**: read the receipt, understand the authority and the evidence, keep going from that point. The receipt schema is designed to make that continuation legible.

## Security

The catalog is public if your Lab instance is public. To restrict access, use Cloudflare Access, a private Worker URL, or only expose the catalog on internal deploys.
