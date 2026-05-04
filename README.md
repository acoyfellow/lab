# Lab

**A sandbox that hands you the receipt.**

Lab runs JavaScript in Cloudflare V8 isolates. Every run gets a permalink with the code, the capabilities you granted, the inputs and outputs of each step, and the timing. Agents read the JSON. Humans open the page.

Try it: [lab.coey.dev/compose](https://lab.coey.dev/compose) · Docs: [lab.coey.dev/docs](https://lab.coey.dev/docs)

> **0.0.3** — APIs may move before 1.0. Pin exact versions or self-host.

---

## 60-second start

```bash
npm install @acoyfellow/lab
```

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "https://lab.coey.dev" });

const r = await lab.runSandbox({ body: "return 40 + 2" });

console.log(r.result);    // 42
console.log(r.resultId);  // open: https://lab.coey.dev/results/<id>
```

Or with curl:

```bash
curl -X POST https://lab.coey.dev/run \
  -H 'content-type: application/json' \
  -d '{"body":"return 40 + 2","capabilities":[]}'
# → { "ok": true, "result": 42, "resultId": "abc123def4" }
```

---

## What you get

- **Isolates.** Every run is a fresh V8 isolate. No shared state, milliseconds to first instruction.
- **Capabilities.** Code has no I/O unless you grant it. `kvRead`, `workersAi`, `r2Read`, `d1Read`, `spawn`, `durableObjectFetch`, `containerHttp`. Denied calls fail loudly in the receipt.
- **Receipts.** `GET /results/:id` for humans, `GET /results/:id.json` for agents. Includes code, capabilities, per-step input/output, errors, timing.
- **Chains.** Multiple steps, fresh isolate per step, previous output becomes next input.
- **Spawn.** Fan out from inside a parent isolate, bounded depth.
- **Generate.** Prompt → AI writes JS → run it. Receipt records both.

---

## Patterns

These are the workflows agents build with Lab. Every one ends with a URL someone else can verify.

```js
// Prove it: claim → run → receipt
const out = await lab.runChain([
  { name: "Spec",      body: "return { cases: [...] }",       capabilities: [] },
  { name: "Implement", body: "return input.cases.map(...)",   capabilities: [] },
  { name: "Verdict",   body: "return { score, verdict }",     capabilities: [] },
]);

// Self-heal: failure becomes input to the fix
await lab.runChain([
  { name: "Try parse", body: "try { ... } catch(e) { return { error: e.message } }" },
  { name: "Heal",      body: "if (!input.error) return input; const fixed = ...; return JSON.parse(fixed);" },
]);

// Handoff: one receipt URL is the entire interface
const a = await lab.runChain(researchSteps);
// Agent B (separate process):
const prev = await fetch(`${LAB_URL}/results/${a.resultId}.json`).then(r => r.json());
const b = await lab.runSandbox({ body: `return formatReport(${JSON.stringify(prev.outcome.result)})` });

// Canary: old vs new on the same inputs
const [old, neu] = await Promise.all([
  lab.runSandbox({ body: oldLogic }),
  lab.runSandbox({ body: newLogic }),
]);

// Stress: 50 runs, find what breaks
const runs = await Promise.all(
  Array.from({ length: 50 }, () => lab.runSandbox({ body: targetCode }))
);
```

Full walk-through: [lab.coey.dev/docs/patterns](https://lab.coey.dev/docs/patterns).

---

## MCP for agents

Drop Lab into Claude Desktop, Cursor, or any MCP client:

```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": { "LAB_URL": "https://lab.coey.dev" }
    }
  }
}
```

Tools: `find` (discover capabilities, fetch receipts), `execute` (run any mode), `session` (Artifact-backed work sessions), `receipt` (save proof for MCP calls, browser work, long task checkpoints).

---

## Sessions: tying receipts to a repo

A session binds a Cloudflare Artifact (or local git) repo to the receipt trail an agent writes against it. Use it when the next agent needs to know not just *what ran* but *what was the goal, what's done, what's next, what's risky*.

```js
const session = await lab.createSession({
  title: "Ship the receipt broker",
  artifact: { repo: "receipt-broker", branch: "main", head: "abc123" },
});

const receipt = await lab.createSessionReceipt(session.sessionId, {
  source: "codex",
  action: "edit",
  capabilities: ["filesystem.write", "shell.test"],
  input: { intent: "Add session receipts" },
  output: { changed: ["worker/index.ts"] },
});

await lab.updateSessionSummary(session.sessionId, {
  goal: "Ship the receipt broker",
  state: "Endpoint and SDK calls implemented",
  nextAction: "Run dogfood checks, fix the first real gap",
  risks: ["Continuation may be noisy without a concise summary"],
  importantReceiptIds: [receipt.resultId],
});
```

---

## Standalone CLI for repo work

If you'd rather run commands against a real repo on your machine and capture the trail locally:

```bash
bun install && bun run build:client && bun run --cwd packages/lab-cli build

# Run the demo: temp git repo → snapshot → command → receipt → replay
bun run demo:local-run

# Run a real command in your repo, snapshot dirty work to lab/run-* first
node packages/lab-cli/dist/cli.js repo-run --repo . --snapshot -- sh -lc 'bun test'

# List recent runs
node packages/lab-cli/dist/cli.js runs --repo .

# Replay a run with lineage
node packages/lab-cli/dist/cli.js replay run_YYYYMMDDHHMMSS_abcdef --repo .
```

Run against a Cloudflare Artifacts repo:

```bash
node packages/lab-cli/dist/cli.js repo-run \
  --artifacts default/my-repo --branch main \
  --account-id "$CLOUDFLARE_ACCOUNT_ID" \
  --token "$CLOUDFLARE_ARTIFACTS_REPO_TOKEN" \
  -- sh -lc 'bun test'
```

For Artifacts control-plane operations (creating repos, etc.), set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (token needs **Artifacts:Read** + **Artifacts:Edit**). Lab passes repo-scoped `art_v1_*` tokens via Git `Authorization: Bearer …` headers and redacts `cfut_*` and `art_v1_*` values from durable run evidence.

CI proves the quickstart from a fresh clone:

```bash
bun run prove:quickstart
```

---

## API reference

| Method | Path | Description |
|---|---|---|
| `GET`  | `/health` | Health check |
| `POST` | `/run` | Run code in a sandbox |
| `POST` | `/run/kv` | Run with `kvRead` capability |
| `POST` | `/run/chain` | Multi-step pipeline |
| `POST` | `/run/spawn` | Nested isolates with depth budget |
| `POST` | `/run/generate` | AI-generated code + run |
| `POST` | `/sessions` | Create an Artifact-backed agent session |
| `GET`  | `/sessions` | List recent sessions |
| `GET`  | `/sessions/:id` | Fetch a session and its receipt IDs |
| `POST` | `/receipts` | Save a receipt for external agent work |
| `POST` | `/sessions/:id/receipts` | Receipt directly into a session |
| `POST` | `/seed` | Seed demo KV data |
| `GET`  | `/lab/catalog` | Capability metadata for agents |
| `GET`  | `/results/:id` | Receipt viewer (human) |
| `GET`  | `/results/:id.json` | Receipt JSON (agent) |
| `GET`  | `/receipts/:id` | Receipt viewer (alias) |
| `GET`  | `/receipts/:id.json` | Receipt JSON (alias) |

### TypeScript client

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "..." });

lab.runSandbox({ body, capabilities? })          // Single sandbox
lab.runKv({ body })                              // With KV snapshot
lab.runChain(steps)                              // Multi-step
lab.runSpawn({ body, capabilities?, depth? })    // Nested isolates
lab.runGenerate({ prompt, capabilities? })       // AI-generated code
lab.createSession({ title, artifact })           // Artifact-backed session
lab.getSession(sessionId)                        // Inspect session state
lab.listSessions()                               // Recent sessions
lab.createReceipt({ source, action, ... })       // MCP / browser / task receipt
lab.createSessionReceipt(sessionId, receipt)     // Attach receipt to session
lab.seed()                                       // Seed demo data
lab.getResult(resultId)                          // Fetch receipt JSON
```

Effect client: `import { createLabEffectClient } from "@acoyfellow/lab/effect"`.

---

## Self-host

Your agents, your data:

```bash
git clone https://github.com/acoyfellow/lab.git && cd lab
bun install && bun run deploy
```

Requires Cloudflare Workers Paid ($5/mo). [Alchemy](https://github.com/sam-goodwin/alchemy) provisions the public app, private Worker, KV, two D1 databases, Worker Loader, Durable Objects, and optional R2 / AI bindings.

For private use, set `LAB_AUTH_TOKEN` on the deployed worker — every request must then carry `Authorization: Bearer …` and receipt URLs become unreachable without it.

---

## Project structure

```
worker/              Sandbox engine (Effect v4, Worker Loaders)
  index.ts           Routes, chain/spawn orchestration, receipt storage
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
bun run dev     # full stack: Worker (:1337) + SvelteKit app (:5173)
bun run dev:ui  # UI only (:4179); requires LAB_WORKER_ORIGIN
bun test        # Guest body syntax validation
bun run lint    # oxlint
bun run check   # svelte-check + typecheck
```

`bun run dev` requires local Cloudflare auth. If you only want to work on the app shell:

```bash
LAB_WORKER_ORIGIN=https://lab.coey.dev bun run dev:ui
```

The app proxies to `LAB_WORKER_ORIGIN`, then `LAB_URL`, then `http://localhost:1337`. If no Worker is reachable, Compose returns a "Lab Worker unavailable" error instead of a 500.

---

## License

MIT
