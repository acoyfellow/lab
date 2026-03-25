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
  { code: "return input.map((n: number) => n * 2)", capabilities: [] },
]);
```

`baseUrl` is the public origin that serves **`POST /run/*`**, **`GET /t/:id`**, and **`POST /seed`**. It is **not** a Cloudflare API key (deploy secrets stay with the operator).

In this monorepo, the app often **proxies** those paths to the isolate Worker; then **`baseUrl`** is usually the **site URL**. If you expose the Worker on its own hostname, use that.

## Self-host

1. [Bun](https://bun.sh), Cloudflare account; isolate Worker bindings include `LOADER`, `KV`, `AI`, `SELF`, `R2`, `ENGINE_D1`, `LAB_DO` (see [`alchemy.run.ts`](alchemy.run.ts)).
2. `git clone`, `cd`, `bun install`.
3. Deploy: `bun run deploy` or CI ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).
4. Smoke: `LAB_URL=https://your-origin bun run dogfood:lab` ([`scripts/dogfood-lab.ts`](scripts/dogfood-lab.ts)).

## Capabilities

Guest features are **strings** in each run (e.g. `kvRead`, `r2Read`, `workersAi`, `d1Read`, `durableObjectFetch`, `containerHttp`, `spawn`). Each maps to a **shim** and optional **host invoke** routes. Denials and behavior appear on **`/t/:id`**.

Full catalog, curl, and shapes: **`/docs`** on a deployed app, plus [`docs/trace-schema.md`](docs/trace-schema.md).

## License

MIT
