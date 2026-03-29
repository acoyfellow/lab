# HTTP API

Every Lab feature is available as an HTTP endpoint. You can call these with `curl`, any HTTP client, or the [TypeScript client](/docs/typescript).

All examples use `$LAB_URL` — set this to your instance URL (e.g. `export LAB_URL=https://your-instance.example`).

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
| POST | `/seed` | Load demo data into KV |
| GET | `/t/:id` | Fetch a saved run result |
| GET | `/t/:id.json` | Same as above (JSON) |
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

**Response:** `{ ok, result }` — plus `traceId` if the run was saved.

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

Each step can have different permissions. The response includes timing and I/O for every step.

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

Loads demo data into KV for testing. No saved result is created.

---

## GET /t/:id

Fetch a saved run result. Returns JSON with the code, inputs, outputs, timing, and success/failure status. See [result schema](/docs/trace-schema) for the full format.

`GET /t/:id.json` returns the same JSON.

---

## GET /lab/catalog

Machine-readable JSON describing all available permissions, endpoints, and hints for LLMs. Use this for agent auto-discovery instead of hardcoding API details. See [agent integration](/docs/agent-integration).
