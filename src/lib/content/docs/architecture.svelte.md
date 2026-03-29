# How Lab works

## You send code. Lab runs it. You get a saved result.

That's the whole idea. Your agent (or script, or curl command) sends JavaScript to Lab. Lab runs it inside a Cloudflare sandbox — a fresh, isolated environment that starts in milliseconds. When you run code on Lab, the saved-result JSON is available at `GET /results/:id.json`. Humans can open `GET /results/:id` in the public app viewer. Successful runs include full step data. Failed or aborted runs include the error and reason; per-step detail may be partial.

---

## Permissions start at zero

Your code can't do anything dangerous by default. It runs in a locked-down sandbox with no network access, no storage, no AI calls — nothing.

You unlock what it needs by declaring permissions:

| Permission | What it unlocks |
|---|---|
| `kvRead` | Read from Cloudflare KV storage |
| `workersAi` | Call Cloudflare AI models |
| `r2Read` | Read files from Cloudflare R2 |
| `d1Read` | Query the guest-readable engine D1 database |
| `spawn` | Launch more sandboxed code (with equal or fewer permissions) |
| `durableObjectFetch` | Call a Durable Object through the host Worker |
| `containerHttp` | Call a configured container binding |
| `petri` | Mutate and read a Petri dish (experimental) |

If you don't declare it, the code can't use it. There's no "grant all" shortcut.

---

## Multi-step pipelines

You can run multiple pieces of code in sequence. The output of each one becomes the `input` of the next:

```
Step 1: Fetch data     →  { users: [...] }
Step 2: Transform it   →  { cleaned: [...] }
Step 3: Validate it    →  { valid: true, count: 42 }
```

Each step runs in its own sandbox. Each step can have different permissions. Step 1 might need `kvRead`. Step 2 might need nothing. Step 3 might need `d1Read`.

---

## Code can launch more code

If you grant the `spawn` permission, your code can launch additional sandboxes — useful for parallel work or breaking a problem into parts.

There's a depth limit. Each level down gets the same or fewer permissions than its parent, never more. At depth 0, spawning is blocked entirely.

---

## What gets saved

Every run saves a JSON result document. `GET /results/:id.json` is the canonical machine path, and `GET /results/:id` is the human-facing viewer on the public app.

For successful runs, it contains:

- The code that ran in each step
- Each step's input and output
- Timing for each step

For failed or aborted runs, it contains the top-level error and reason. Per-step detail depends on where the run stopped and may be partial or empty — see [Failures & step data](/docs/failures).

See [the full schema](/docs/result-schema) for details.

---

## The four packages

| Package | What it does | Install |
|---|---|---|
| [`@acoyfellow/lab`](https://www.npmjs.com/package/@acoyfellow/lab) | TypeScript client — run code, get results | `npm i @acoyfellow/lab` |
| [`@acoyfellow/lab-cli`](https://www.npmjs.com/package/@acoyfellow/lab-cli) | CLI — agents shell out, get results back | `npm i -g @acoyfellow/lab-cli` |
| [`@acoyfellow/lab-mcp`](https://www.npmjs.com/package/@acoyfellow/lab-mcp) | MCP server — plug Lab into Cursor, Claude Code | `npm i -g @acoyfellow/lab-mcp` |
| [`@acoyfellow/lab-petri`](https://www.npmjs.com/package/@acoyfellow/lab-petri) | Persistent shared state for experiments | `npm i @acoyfellow/lab-petri` |

---

## Under the hood (for contributors)

<details>
<summary>Cloudflare Worker Loaders</summary>

Lab runs code using [Worker Loaders](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/) — a Cloudflare feature (closed beta) that creates V8 isolates at runtime from a string of code. Single-digit millisecond startup, near-zero cost.

Worker Loaders don't have a built-in permission model — an isolate either has full network access or none. Lab adds the permission layer on top.
</details>

<details>
<summary>How permissions work internally</summary>

Permissions that can't be passed directly into a sandbox (AI, R2, D1, Durable Objects) use a proxy pattern: the sandbox calls an internal URL, and the parent Worker handles it with the real Cloudflare bindings. This keeps privileged access on the host side.

KV works differently — the parent reads the data into memory before creating the sandbox, and injects it as a snapshot. This means KV data is a point-in-time copy, not a live connection.
</details>

<details>
<summary>How spawning works internally</summary>

Sandboxes can't create other sandboxes directly — they don't have the Worker Loader binding. Instead, they make a fetch request back to the parent Worker via a `SELF` service binding, which creates a new sandbox on their behalf. Depth is decremented at each level.
</details>

<details>
<summary>Effect (TypeScript library)</summary>

The Worker internals use [Effect](https://effect.website) for typed error handling, service injection, and composition. New Worker-side behavior should stay in Effect pipelines. The client libraries and website are plain TypeScript/Svelte over `fetch`.
</details>

<details>
<summary>Code generation (`/run/generate`)</summary>

The `/run/generate` endpoint takes a natural language prompt, builds a system prompt from capability hints, and runs a Cloudflare AI model. The generated code gets cleaned up (strip markdown fences, unwrap wrappers, auto-add `return`) before running in a sandbox.
</details>
