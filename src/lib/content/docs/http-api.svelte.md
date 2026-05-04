# HTTP API

Every supported Lab run mode is available as an HTTP endpoint on the public app origin. You can call these with `curl`, any HTTP client, or the [TypeScript client](/docs/typescript).

All examples use `$LAB_URL` — set this to your public app origin (e.g. `export LAB_URL=https://your-lab.example`). In the monorepo, that is `http://localhost:5173`.

Related: [Permissions](/docs/capabilities) · [Limits](/docs/limits) · [Failures](/docs/failures) · [Security](/docs/security)

## Endpoints at a glance

| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/run` | Run code in a sandbox |
| POST | `/run/kv` | Run code with KV storage access |
| POST | `/run/chain` | Run a multi-step pipeline |
| POST | `/run/spawn` | Run code that can launch nested sandboxes |
| POST | `/run/generate` | AI writes code from a prompt, then runs it |
| POST | `/sessions` | Create an Artifact-backed work session |
| GET | `/sessions` | List recent sessions |
| GET | `/sessions/:id` | Fetch session state, summary, and receipt IDs |
| POST | `/sessions/:id/summary` | Update the continuation summary |
| POST | `/sessions/:id/receipts` | Save a receipt directly into a session |
| POST | `/receipts` | Save a receipt for external agent work |
| POST | `/seed` | Load demo data into KV |
| GET | `/results/:id` | Open the receipt viewer |
| GET | `/results/:id.json` | Fetch canonical receipt JSON |
| GET | `/lab/catalog` | Machine-readable API description (for agents) |

## Quick examples

**Run code:**
```bash
curl -X POST $LAB_URL/run \
  -H 'Content-Type: application/json' \
  -d '{"body":"return { sum: [1,2,3].reduce((a,b)=>a+b, 0) }"}'
```

**Run a pipeline:**
```bash
curl -X POST $LAB_URL/run/chain \
  -H 'Content-Type: application/json' \
  -d '{"steps":[{"body":"return [1, 2, 3]","capabilities":[]}, ...]}'
```

**Run with permissions:**
```bash
curl -X POST $LAB_URL/run \
  -H 'Content-Type: application/json' \
  -d '{"body":"return await d1.query(\"SELECT 1 as n\")","capabilities":["d1Read"]}'
```

---

## POST /run

Run a single piece of JavaScript in a sandbox.

**Body:** `{ body, capabilities? }`

**Response:** `{ ok, result }` — plus `resultId`. `POST /seed` is the only endpoint that does not create a receipt.

---

## POST /run/kv

Same as `/run`, but automatically includes `kvRead` permission. Your code can use `kv.get()` and `kv.list()` to read from KV storage.

After seeding (`POST /seed`):
```bash
curl -X POST $LAB_URL/run/kv \
  -H 'Content-Type: application/json' \
  -d '{"body":"const keys = await kv.list(\"user:\"); return keys;"}'
```

---

## POST /run/chain

Run multiple pieces of code in sequence. Each one's output becomes the next one's `input`.

**Body:** `{ steps: [{ body, capabilities, name?, input? }] }`

Each step can have different permissions. Successful chain runs include timing and I/O for every step. Failed or aborted chain runs still save the top-level `error` and `reason`, but the `steps` array may be partial or empty.

---

## POST /run/spawn

Run code that can launch nested sandboxes.

**Body:** `{ body, capabilities, depth? }`

Inside your code, call `spawn(code, capabilities)` to launch child sandboxes. Default depth is 2. At depth 0, spawning is blocked.

---

## POST /run/generate

Give a prompt in plain English. Lab uses an AI model to write JavaScript, then runs it.

**Body:** `{ prompt, capabilities }`

**Response:** includes `generated` (the code that was written), `generateMs`, and `runMs`.

Include permission strings so the AI knows what APIs are available when writing code.

---

## POST /seed

Loads demo data into KV for testing. No receipt is created.

---

## Sessions

Create a session for an Artifact worktree, then keep its summary fresh as work progresses.

```bash
curl -X POST $LAB_URL/sessions \
  -H 'Content-Type: application/json' \
  -d '{"title":"Ship receipts","artifact":{"repo":"lab","branch":"main"}}'
```

Update the continuation summary:

```bash
curl -X POST $LAB_URL/sessions/$SESSION_ID/summary \
  -H 'Content-Type: application/json' \
  -d '{
    "goal": "Ship receipt summaries",
    "state": "API is implemented and checks are running",
    "nextAction": "Dogfood continuation from the session page",
    "risks": ["Summary can drift if agents forget to update it"],
    "importantReceiptIds": ["abc123"],
    "updatedByReceiptId": "abc123"
  }'
```

Use `POST /sessions/:id/receipts` with the same body as `/receipts` when the receipt belongs to a session.

---

## POST /receipts

Save a receipt for work that happened outside Lab's sandbox: an MCP tool call, browser action, long-running task checkpoint, review decision, or handoff.

**Body:**
```json
{
  "source": "cf-portal",
  "action": "workers.list",
  "capabilities": ["cf.workers.read"],
  "input": { "account": "..." },
  "output": { "count": 12 },
  "replay": {
    "mode": "inspect-only",
    "available": false,
    "reason": "Read-only observation"
  }
}
```

Replay modes:

- `inspect-only` — the receipt can be read, but not safely re-run.
- `rerun-sandbox` — the work can be re-run inside Lab.
- `rerun-live-requires-approval` — live replay touches real services and needs explicit approval.
- `continue-from-here` — another agent should use this receipt as the next starting point.

**Response:** `{ ok, resultId }`

---

## GET /results/:id

Open the receipt in the public app viewer. Agents and scripts should read `GET /results/:id.json` instead.

## GET /results/:id.json

Fetch the canonical receipt JSON. See [result schema](/docs/result-schema) for the full format.

---

## GET /lab/catalog

Machine-readable JSON describing all available permissions, endpoints, and hints for LLMs. Use this for agent auto-discovery instead of hardcoding API details. See [agent integration](/docs/agent-integration).
