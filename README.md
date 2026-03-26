# lab

**Release: 0.0.1 (early feedback).** API and trace shapes may still move; treat as a demo you can fork and self-host, not a stable semver contract yet.

**Lab** is a **chainable** edge execution layer: run **untrusted JavaScript** in **isolated Cloudflare Workers**, then **chain** steps (and spawn child isolates) with **explicit capabilities** per step.

**Operators** attach resources in deploy. **LAB** (this repo) owns how they become guest surfaces, HTTP routes, and the **`@acoyfellow/lab`** client—not runtime parsing of config.

**Live:** https://lab.coey.dev

## Demo (chain + inspect)

Open **Compose** → run **Chain** → click the returned `traceId`.

### Why this exists

Think of **Cloudflare’s edge as the work plane** and your app, browser, or agent as the **control plane**: you ship **small requests**, the edge runs **sandboxed guest work** (isolates, chains, spawn), and you get **traces** back. Picture **one elastic pool of edge compute you drive remotely**—not a literal supercomputer or HPC cluster, but a **repeatable way to offload untrusted compute** with **least-privilege capabilities**.

The **isolate Worker** ([`worker/`](worker/)) uses **Effect `4.0.0-beta.40`** (exact pin in [`package.json`](package.json)). [Effect’s v4 beta post](https://effect.website/blog/releases/effect/40-beta/) still notes **v3 for production** until v4 stabilizes; this repo opts into the beta on purpose for runtime and bundle work.

## Tests and CI

| Command | What it does |
| --- | --- |
| `bun test` | Unit tests only: canonical **guest bodies** must be valid JS (Loader does not transpile TS). See [`src/lib/guest-code.test.ts`](src/lib/guest-code.test.ts). |
| `bun run lint` | [oxlint](https://oxc.rs/docs/guide/usage/linter) on JS/TS (`.svelte` is **not** linted here). `--deny-warnings` in CI. |
| `bun run check` | `svelte-check` + build `@acoyfellow/lab` + typecheck `@acoyfellow/lab-mcp`. |

**Not in CI:** live **Worker** integration tests (Loader, KV snapshot, `/invoke/*`, `GET /t/:id.json`). PR CI stays `bun test` / `check` / `lint` / `build` only — no guaranteed local Worker port. **Manual smoke:** `bun dev` → **`bun run dogfood:lab`** (default `LAB_URL=http://localhost:1337`; checks `fetchLabCatalog`, `getTrace`, and `getTraceJson`).

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (PR + main). Deploy workflow runs the same checks before `alchemy deploy`.

## One loop

1. **Browser** — [Compose](https://lab.coey.dev/compose) → run → **`/t/:id`** (share, inspect, Fork).
2. **HTTP** — `POST /run/…` (and related paths) → optional **`traceId`** → `GET /t/:id` (or `GET /t/:id.json`; same body).
3. **TypeScript** — `createLabClient({ baseUrl })` against **your** origin (`/run/*`, `/t/:id`, `/seed`). Use **`getTraceJson`** if you want the explicit `.json` path against a Worker-only origin.

**Examples → Compose:** [Examples](https://lab.coey.dev/examples) “Run” preloads chain steps by writing `sessionStorage` key `lab-fork` (`{ mode: 'chain', steps }`), then navigating to Compose — same idea as Fork from a trace or the tutorial sandbox. Do not rely on `?example=` query params.

### Agent / MCP (0.0.1)

**Two-tool model:** progressive disclosure — **`find`** (catalog slice or trace JSON) and **`execute`** (sandbox, kv, chain, spawn, generate, seed). Implemented as a stdio MCP server in this monorepo: **`@acoyfellow/lab-mcp`** ([`packages/lab-mcp`](packages/lab-mcp)), **Effect v4 beta** (`effect@4.0.0-beta.40`) + `@acoyfellow/lab/effect`.

**Run locally:** set **`LAB_URL`** (e.g. `http://localhost:1337` with `bun dev`), then `bun run mcp:lab` (stdio; intended for Cursor / other MCP hosts).

**Lookup (raw HTTP):** `GET /lab/catalog` on the Worker (or the app’s proxied `/lab/catalog`) — same JSON the MCP `find` tool uses.

**Execute (raw HTTP):** `POST /run*` as in the table below.

**`@acoyfellow/lab`:** `fetchLabCatalog({ baseUrl })` then `createLabClient` for Promise callers; `createLabEffectClient` + **`fetchLabCatalogEffect`** for Effect. See [Cursor MCP example](docs/cursor-mcp-lab.example.json).

On-site doc: **`/docs/agent-integration`** when the app is running.

## Install (integration)

```bash
npm install @acoyfellow/lab
```

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL ?? "https://your-lab-origin.example",
});

const out = await lab.runChain([
  { body: "return [1, 2, 3]", capabilities: [] },
  { body: "return input.map((n) => n * 2)", capabilities: [] },
]);
```

`baseUrl` is the public origin that serves **`POST /run/*`**, **`GET /lab/catalog`**, **`GET /t/:id`**, and **`POST /seed`**. It is **not** a Cloudflare API key (deploy secrets stay with the operator).

In this monorepo, the app often **proxies** those paths to the isolate Worker; then **`baseUrl`** is usually the **site URL**. If you expose the Worker on its own hostname, use that.

## HTTP API (0.0.1)

| Method | Path | JSON body |
|--------|------|-----------|
| POST | `/run` | `{ body, template?, capabilities? }` — `code` accepted as legacy alias for `body`; default template `guest@v1` |
| POST | `/run/kv` | same as `/run` (always grants `kvRead`) |
| POST | `/run/chain` | `{ steps: [{ body, template?, capabilities, name?, props?, input? }] }` — `code` per step optional alias |
| POST | `/run/spawn` | `{ body, template?, capabilities[], depth? }` — needs `spawn` in `capabilities` |
| POST | `/run/generate` | `{ prompt, capabilities[], template? }` |
| POST | `/seed` | `{}` |
| GET | `/lab/catalog` | — JSON catalog for agents (caps, templates, execute map) |
| GET | `/t/:id` or `/t/:id.json` | — same stored trace JSON ([`docs/trace-schema.md`](docs/trace-schema.md)) |

Internal: `POST /spawn/child`, `POST /invoke/*` (host shims for guests).

## TypeScript client (`@acoyfellow/lab`)

| Method | Request |
|--------|---------|
| `fetchLabCatalog` | — (uses `baseUrl`) |
| `runSandbox` | `{ body?, code?, template?, capabilities? }` |
| `runKv` | same |
| `runChain` | `ChainStep[]` — each: `body?`, `code?`, `template?`, `capabilities`, `props?`, `input?` |
| `runSpawn` | `{ body?, code?, template?, capabilities[], depth? }` |
| `runGenerate` | `{ prompt, capabilities[], template? }` |
| `seed` | — |
| `getTrace` | `traceId: string` |
| `getTraceJson` | same trace via `GET /t/:id.json` |

## Self-host

1. [Bun](https://bun.sh), Cloudflare account; isolate Worker bindings include `LOADER`, `KV`, `AI`, `SELF`, `R2`, `ENGINE_D1`, `LAB_DO` (optional: `LAB_CONTAINER` — see [`alchemy.run.ts`](alchemy.run.ts)).
2. `git clone`, `cd`, `bun install`.
3. Deploy: `bun run deploy` or CI ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).
4. Smoke: `LAB_URL=https://your-origin bun run dogfood:lab` ([`scripts/dogfood-lab.ts`](scripts/dogfood-lab.ts)). Manual: `bun dev` → **Compose** (modes) → trace **`/t/:id`** and **`/t/:id.json`**; curl **`/lab/catalog`** (Worker or app proxy); **`/docs`** (incl. **`/docs/agent-integration`**) render.

## Capabilities

Guest capability ids are **strings** per run or per chain step (e.g. `kvRead`, `spawn`, `workersAi`, …). Each maps to a **shim** and, for some caps, **host** routes under `/invoke/*`. Denials and I/O show on **`GET /t/:id`**. Registry + **`llmHint`** stubs for codegen: [`worker/capabilities/registry.ts`](worker/capabilities/registry.ts). Guest **template** module shell: [`worker/guest/templates.ts`](worker/guest/templates.ts).

| Capability | Binding | What it is | Pros | Cons / caveats |
| --- | --- | --- | --- | --- |
| **`kvRead`** | `KV` | Point-in-time **snapshot** of the namespace into the isolate; guest uses `kv.get` / `kv.list` on that copy. | No live `KVNamespace` in Loader env; predictable read-only view for one run. | Stale vs live KV after snapshot; **no writes**; big prefixes can cost memory and time. |
| **`spawn`** | `SELF` | **Nested isolates** via `POST /spawn/child`; depth budget decreases each level. | Sandboxed recursion with a hard **depth cap**; same capability model at each level. | Hits depth at 0; extra round-trips; `/run/spawn` without the cap can **400**. |
| **`workersAi`** | `AI` | Guest `ai.run(prompt)`; host runs Workers AI on **`POST /invoke/ai`** (`SELF` outbound). | Keys stay on the host; guest never sees provider secrets. | **Cost / quota**; latency per call; policy is yours (prompts, limits). |
| **`r2Read`** | `R2` | Guest `r2.list` / `r2.getText`; host **`POST /invoke/r2`**. | Reads object storage without R2 credentials in guest code. | Read-focused API; **503** if R2 unbound; large listings can be slow. |
| **`d1Read`** | `ENGINE_D1` | Guest `d1.query(sql)` **read-only**; host **`POST /invoke/d1`**. | SQL from guest without a raw D1 binding in the Loader. | Read-only; **503** if D1 unbound; expose only SQL you trust (injection / heavy queries). |
| **`durableObjectFetch`** | `LAB_DO` | Guest calls into a **named stub DO** via host **`POST /invoke/do`**. | RPC-style DO access without handing guest the real binding. | **503** if unconfigured; semantics depend on your stub class. |
| **`containerHttp`** | `LAB_CONTAINER` (optional) | Guest **`POST /invoke/container`** for HTTP GET-style access to a bound **container** service. | Same leash model for heavier or non-Worker workloads. | Often **503** until you bind `LAB_CONTAINER`; more moving parts than Workers-only caps. |

More detail, curl, and request shapes: **`/docs`** on your deploy (start at **`/docs/capabilities`**), plus [`docs/trace-schema.md`](docs/trace-schema.md).

## License

MIT
