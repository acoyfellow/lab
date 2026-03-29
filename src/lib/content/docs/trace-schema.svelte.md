# Run result format

When you run code on Lab, the result is saved as JSON at a URL (`/t/:id`). Successful runs include full step data. Failed or aborted runs include the error and reason; per-step detail may be partial. See [Failures & traces](/docs/failures). This page describes the result schema.

## Top-level fields

| Field | Type | What it is |
|---|---|---|
| `id` | string | Unique ID (same as the URL) |
| `type` | string | How the code was run: `sandbox`, `kv`, `chain`, `generate`, or `spawn` |
| `createdAt` | string | When it ran (ISO 8601) |
| `request` | object | What was sent in (code, permissions, prompt, etc.) |
| `outcome` | object | What happened — `ok: true` with a `result`, or `ok: false` with `error` and `reason` |
| `timing` | object | How long it took (`totalMs`, and for AI-generated runs: `generateMs`, `runMs`) |
| `generated` | string? | The code the AI wrote (only for `/run/generate`) |
| `trace` | array? | Per-step details (only for `/run/chain`) |

## The `request` field (varies by type)

- **sandbox / kv:** `{ body, capabilities? }` — the code and permissions
- **chain:** `{ steps: [{ body, capabilities, name?, input? }] }` — each step in the pipeline
- **generate:** `{ prompt, capabilities }` — what you asked the AI to build
- **spawn:** `{ body, capabilities, depth? }` — the code and nesting limit

## Per-step details (pipelines only)

When you run a pipeline (`/run/chain`), the `trace` array contains one entry per step:

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

Every run response includes a `traceId`. Use it to fetch the full result later:

- `GET /t/:id` — JSON
- `GET /t/:id.json` — same JSON (alternate URL)

`POST /seed` is the only endpoint that doesn't create a saved result.
