# FAQ (AI-curious engineers)

Short answers for folks who like agents, MCP, and shipping real integrations. Deeper detail lives on the linked pages.

## 1. How do agents actually call this?

**MCP** (stdio server in `@acoyfellow/lab-mcp`) or **raw HTTP**: `GET /lab/catalog` for capability and execute metadata, then `POST /run`, `/run/chain`, etc. See [Agent integration](/docs/agent-integration) and [HTTP API](/docs/http-api). A minimal loop is: discover paths from the catalog, run, read `traceId`, then fetch `GET /t/:id.json`. Humans can open `GET /t/:id` in the app viewer. Successful runs include full step data; failed or aborted runs may include partial-or-empty step detail.

## 2. How tight is the sandbox for LLM-generated or user-supplied JS?

Guest code runs in **Worker Loader** isolates with an explicit **capability** set per run (and per chain step). No capability ⇒ no shim for KV, spawn, Workers AI, R2, D1, DO, containers. **`/run/generate`** asks Workers AI to emit a **guest body**, then runs it under the capabilities you passed—same isolation model as hand-written code. See [Security](/docs/security), [Capabilities](/docs/capabilities), and [Architecture](/docs/architecture).

## 3. What’s the observability story for agent runs?

Every persisted run returns a **`traceId`**. The saved result document contains the request shape, outcome, timing, and per-step data for successful chains. Agents should read **`/t/:id.json`**. Humans can open **`/t/:id`** as the viewer over that same saved result. It’s a shareable artifact, not a full “agent session” product—you correlate tool calls to saved results in your own control plane. See [Saved result schema](/docs/trace-schema) and [Failures & traces](/docs/failures) (including chain failure behavior).

## 4. Cost and limits—what breaks first?

Platform **CPU/time** and **Workers** limits apply; Lab doesn’t add a separate chain step cap in code. Spawn depth is bounded; R2 invoke caps list/size in the Worker. See [Limits](/docs/limits). For dollars-on-the-bill precision, use Cloudflare’s published pricing and your account—not the saved result’s wall `ms` alone.

## 5. Why edge instead of a Python sidecar or local sandbox?

**Fit:** short, chainable, **least-privilege** guest JS next to **KV / AI / R2 / …** with **traces**. **Poor fit:** long CPU-heavy batch jobs or arbitrary host access—see [When to use Lab](/docs/when-to-use) and [Architecture](/docs/architecture).
