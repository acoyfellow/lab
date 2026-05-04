# Lab

**Receipts for agent work.**

Repo state goes in. Commands run. Logs, results, and receipts come out.

Cloudflare Artifacts are the north-star repo backend: branches, files, diffs, commits. Lab is the adjacent proof layer: every meaningful agent action gets durable evidence that another agent can inspect, replay, continue from, or hand to a human.

The standalone shape is simple:

1. Resolve repo state: local git today, Cloudflare Artifacts as the durable backend.
2. Run an executor: local shell today, Cloudshell/Filepath/Flue/Machine later.
3. Write `.lab/runs/<run_id>/input.json`, `logs.txt`, `result.json`, and `receipt.json`.
4. Continue from evidence instead of asking the next agent to trust a summary.

**Try it now:** [lab.coey.dev/compose](https://lab.coey.dev/compose)

> **0.0.3** — API and result shapes may still move. Pin to exact versions or self-host.

---

## 7-Minute Quickstart

### Standalone CLI

```bash
bun install
bun run build:client
bun run --cwd packages/lab-cli build
```

Run the complete local demo:

```bash
bun run demo:local-run
```

It creates a temporary git repo, makes dirty work, snapshots it onto a `lab/run-*` branch, runs a command, writes a receipt, lists runs, shows one run, and replays it with lineage.

CI proves the quickstart from a fresh clone in under seven minutes:

```bash
bun run prove:quickstart
```

Run a real command in a real repo:

```bash
node packages/lab-cli/dist/cli.js repo-run --repo . -- sh -lc 'bun test'
```

List recent runs:

```bash
node packages/lab-cli/dist/cli.js runs --repo .
```

Show one run:

```bash
node packages/lab-cli/dist/cli.js show run_YYYYMMDDHHMMSS_abcdef --repo .
```

Replay one run:

```bash
node packages/lab-cli/dist/cli.js replay run_YYYYMMDDHHMMSS_abcdef --repo .
```

Snapshot dirty work onto a `lab/run-*` branch before running:

```bash
node packages/lab-cli/dist/cli.js repo-run --repo . --snapshot -- sh -lc 'bun test'
```

Stop a local run if it hangs:

```bash
node packages/lab-cli/dist/cli.js repo-run --repo . --timeout-ms 30000 -- sh -lc 'bun test'
```

Run against Cloudflare Artifacts:

```bash
node packages/lab-cli/dist/cli.js repo-run \
  --artifacts default/my-repo \
  --branch main \
  --account-id "$CLOUDFLARE_ACCOUNT_ID" \
  --token "$CLOUDFLARE_ARTIFACTS_REPO_TOKEN" \
  -- sh -lc 'bun test'
```

For Artifacts control-plane operations such as creating or deleting repos, Lab reads the normal Cloudflare variables:

```bash
export CLOUDFLARE_ACCOUNT_ID="<your-account-id>"
export CLOUDFLARE_API_TOKEN="<cf-api-token>"
```

That API token must be scoped to the same account with **Account > Artifacts:Read** and **Account > Artifacts:Edit**. Git clone and push use repo-scoped `art_v1_*` tokens; Lab passes those tokens with Git `Authorization: Bearer ...` headers and redacts `cfut_*` and `art_v1_*` values from durable run evidence.

That is the product spine:

```text
repo -> executor -> logs/result/receipt
```

### Hosted Client

```bash
npm install @acoyfellow/lab
```

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL, // or https://lab.coey.dev
});

const session = await lab.createSession({
  title: "Ship receipt broker",
  artifact: {
    repo: "receipt-broker",
    branch: "main",
    head: "abc123",
  },
});

const receipt = await lab.createSessionReceipt(session.sessionId, {
  source: "codex",
  action: "edit",
  capabilities: ["filesystem.write", "shell.test"],
  input: { intent: "Add session receipts" },
  output: { changed: ["worker/index.ts", "packages/lab/src/client.ts"] },
  replay: { mode: "continue-from-here", available: true },
});

await lab.updateSessionSummary(session.sessionId, {
  goal: "Ship receipt broker",
  state: "Receipt endpoint and SDK calls are implemented",
  nextAction: "Run dogfood checks and fix the first real gap",
  risks: ["Session continuation may be too noisy without a concise summary"],
  importantReceiptIds: [receipt.resultId],
  updatedByReceiptId: receipt.resultId,
});

console.log(session.sessionId); // Artifact-backed work session
console.log(receipt.resultId);  // Receipt URL id

// Human viewer: $LAB_URL/receipts/:id
// Agent JSON:    $LAB_URL/receipts/:id.json
```

Artifacts answer “what changed?” Lab answers “who did what, under which authority, with what evidence, and where should the next agent resume?”

---

## What Lab Does

Three things to know:

### The session
A session binds an Artifact worktree to the work trail. `POST /sessions` creates the thread; `GET /sessions/:id` shows the Artifact ref, current summary, and ordered receipt IDs. Agents update the summary after checkpoints so the next agent sees goal, state, next action, and risks before reading the full receipt trail.

### The receipt
Every run or external action saves canonical JSON at `/receipts/:id.json`, viewable at `/receipts/:id`. It includes input, output, capabilities, timing, evidence, lineage, replay hints, and Artifact refs. `/results/:id` remains an alias for sandbox run history.

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
| `POST` | `/sessions` | Create an Artifact-backed agent session |
| `GET`  | `/sessions` | List recent sessions |
| `GET`  | `/sessions/:id` | Fetch a session and receipt IDs |
| `POST` | `/receipts` | Receipt external agent work |
| `POST` | `/sessions/:id/receipts` | Receipt work directly into a session |
| `POST` | `/seed` | Write demo KV data |
| `GET`  | `/lab/catalog` | Capability metadata for agents |
| `GET`  | `/results/:id` | Human viewer |
| `GET`  | `/results/:id.json` | Canonical result JSON |
| `GET`  | `/receipts/:id` | Human receipt viewer |
| `GET`  | `/receipts/:id.json` | Canonical receipt JSON |

### TypeScript Client

```js
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "..." });

lab.runSandbox({ body, capabilities? })  // Single sandbox
lab.runKv({ body })                       // With KV snapshot
lab.runChain(steps)                       // Multi-step
lab.runSpawn({ body, capabilities?, depth? })  // Nested isolates
lab.runGenerate({ prompt, capabilities? })     // AI-generated code
lab.createSession({ title, artifact })         // Start an Artifact-backed session
lab.getSession(sessionId)                       // Inspect session state
lab.listSessions()                             // Recent sessions
lab.createReceipt({ source, action, ... })     // MCP/browser/task receipt
lab.createSessionReceipt(sessionId, receipt)   // Attach receipt to session
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

Tools: `find` (discover capabilities, fetch results), `execute` (run any mode), `session` (create/get/list Artifact-backed work sessions), and `receipt` (save proof for MCP calls, browser work, long-running task checkpoints, and handoffs).

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
bun run dev     # full stack: Worker (:1337) + SvelteKit app (:5173)
bun run dev:ui  # UI only (:4179); set LAB_WORKER_ORIGIN to a running Worker
bun test        # Guest body syntax validation
bun run lint    # oxlint
bun run check   # svelte-check + typecheck
```

Full-stack dev uses Alchemy and requires local Cloudflare auth. If you only want
to work on the app shell, run:

```bash
LAB_WORKER_ORIGIN=https://lab.coey.dev bun run dev:ui
```

Compose and result JSON proxy calls use `LAB_WORKER_ORIGIN`, then `LAB_URL`, then
`http://localhost:1337`. If no Worker is reachable, Compose returns a visible
"Lab Worker unavailable" error instead of a Svelte 500.

Integration tests in `worker/index.test.ts` run against a live Worker.

---

## License

MIT
