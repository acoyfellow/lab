# lab

**LAB** maps your **Alchemy / Wrangler** Worker **inventory** ([`alchemy.run.ts`](alchemy.run.ts)) (bindings) to **named capabilities**: **shims** guest code may use inside **V8 isolates**, with **least privilege**, stable errors, and a **durable trace** per run.

**Operators** attach resources in deploy. **LAB** (this repo) owns how they become guest surfaces, HTTP routes, and the **`@acoyfellow/lab`** client—not runtime parsing of config.

**Live:** https://lab.coey.dev

## One loop

1. **Browser** — [Compose](https://lab.coey.dev/compose) → run → **`/t/:id`** (share, inspect, Fork).
2. **HTTP** — `POST /run/…` (and related paths) → optional **`traceId`** → `GET /t/:id`.
3. **TypeScript** — `createLabClient({ baseUrl })` against **your** origin (`/run/*`, `/t/:id`, `/seed`).

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
  { code: "return [1, 2, 3]", capabilities: [] },
  { code: "return input.map((n) => n * 2)", capabilities: [] },
]);
```

`baseUrl` is the public origin that serves **`POST /run/*`**, **`GET /t/:id`**, and **`POST /seed`**. It is **not** a Cloudflare API key (deploy secrets stay with the operator).

In this monorepo, the app often **proxies** those paths to the isolate Worker; then **`baseUrl`** is usually the **site URL**. If you expose the Worker on its own hostname, use that.

## Self-host

1. [Bun](https://bun.sh), Cloudflare account; isolate Worker bindings include `LOADER`, `KV`, `AI`, `SELF`, `R2`, `ENGINE_D1`, `LAB_DO` (optional: `LAB_CONTAINER` — see [`alchemy.run.ts`](alchemy.run.ts)).
2. `git clone`, `cd`, `bun install`.
3. Deploy: `bun run deploy` or CI ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).
4. Smoke: `LAB_URL=https://your-origin bun run dogfood:lab` ([`scripts/dogfood-lab.ts`](scripts/dogfood-lab.ts)).

## Capabilities

Guest features are **strings** per run or per chain step (e.g. `kvRead`, `spawn`, `workersAi`, …). Each maps to a **shim** and, for some caps, **host** routes under `/invoke/*`. Denials and I/O show on **`GET /t/:id`**. Canonical ids: [`worker/capabilities/registry.ts`](worker/capabilities/registry.ts).

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
