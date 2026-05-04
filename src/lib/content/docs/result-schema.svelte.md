# Receipt schema

Every run on Lab produces a receipt: a JSON document at `GET /results/:id.json` (canonical, machine-readable) with a human viewer at `GET /results/:id`. Successful runs include full per-step data. Failed or aborted runs include the error and reason; per-step detail may be partial or empty. See [Failures & step data](/docs/failures).

## Top-level fields

| Field | Type | What it is |
|---|---|---|
| `id` | string | Unique ID (same as the `resultId` and receipt paths) |
| `type` | string | How the result was created: `sandbox`, `kv`, `chain`, `generate`, `spawn`, or `external` |
| `createdAt` | string | When it ran (ISO 8601) |
| `request` | object | What was sent in (code, permissions, prompt, etc.) |
| `outcome` | object | What happened — `ok: true` with a `result`, or `ok: false` with `error` and `reason` |
| `timing` | object | How long it took (`totalMs`, and for AI-generated runs: `generateMs`, `runMs`) |
| `generated` | string? | The code the AI wrote (only for `/run/generate`) |
| `steps` | array? | Per-step details (only for `/run/chain`) |
| `receipt` | object? | External work receipt details (only for `/receipts`) |
| `lineage` | object? | Parent/supersedes links for continued work |

## The `request` field (varies by type)

- **sandbox / kv:** `{ body, capabilities? }` — the code and permissions
- **chain:** `{ steps: [{ body, capabilities, name?, input? }] }` — each step in the pipeline
- **generate:** `{ prompt, capabilities }` — what you asked the AI to build
- **spawn:** `{ body, capabilities, depth? }` — the code and nesting limit
- **external:** `{ source, action, input?, output?, capabilities?, replay?, evidence? }` — work that happened through an MCP, browser, task runner, or other external system

## External receipts

External receipts use `type: "external"` and include a `receipt` object:

| Field | Type | What it is |
|---|---|---|
| `source` | string | MCP server, browser runner, task runner, or external system |
| `action` | string | Tool/action name |
| `capabilities` | string[] | Authority used, such as `cf.workers.read` or `browser.click` |
| `input` | any? | Intent, arguments, or pre-state |
| `output` | any? | Result, post-state, or observation |
| `replay` | object | Replay posture: inspect only, sandbox re-run, live re-run with approval, or continue from here |
| `evidence` | any? | Logs, screenshots, artifact references, before/after data |

## Per-step details (pipelines only)

When you run a pipeline (`/run/chain`), the `steps` array contains one entry per step:

| Field | Type | What it is |
|---|---|---|
| `step` | number | Step index (starts at 0) |
| `name` | string? | Name you gave this step |
| `body` | string? | The code that ran |
| `capabilities` | string[] | Permissions this step had |
| `input` | any | What this step received |
| `output` | any | What this step returned |
| `ms` | number | How long this step took (milliseconds) |

## Getting the result

Every run response includes a `resultId`. Use it to fetch the receipt later:

- `GET /results/:id.json` — canonical machine-readable receipt JSON
- `GET /results/:id` — human viewer on the public app

`POST /seed` is the only endpoint that doesn't create a receipt.
