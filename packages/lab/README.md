# `@acoyfellow/lab`

**Published version tracks lab 0.0.1 (early feedback).**

Typed HTTP client for the [lab](https://github.com/acoyfellow/lab) Worker API: sandboxed isolates, capability chains, KV read, spawn, generate, seed, and trace retrieval.

## Install

```bash
npm install @acoyfellow/lab
```

Requires **Node 18+** (global `fetch`) or any runtime that provides `fetch` (Cloudflare Workers, Deno, Bun).

## Usage

`baseUrl` must be the HTTP **origin** that serves **`POST /run/*`**, **`GET /lab/catalog`**, **`GET /t/:id`** (or **`GET /t/:id.json`**, same JSON), **`POST /seed`** — almost always **your own** deployed lab (see [Self-host](https://github.com/acoyfellow/lab#self-host) in the main repo). It is **not** a Cloudflare API key. If the Worker is served under the same public hostname as the UI, use that URL; otherwise use the Worker’s public origin.

**Agents:** `import { fetchLabCatalog } from "@acoyfellow/lab"` then `fetchLabCatalog({ baseUrl })` for capability hints and execute paths (see main repo **`/docs/agent-integration`**).

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "https://your-lab-origin.example" });

const r = await lab.runSandbox({ body: "return { hello: \"world\" }" });
```

### API

| Method | HTTP |
|--------|------|
| `fetchLabCatalog({ baseUrl, fetch? })` | `GET /lab/catalog` |
| `runSandbox({ body?, code?, template?, capabilities? })` | `POST /run` |
| `runKv({ … })` | `POST /run/kv` |
| `runChain(steps)` | `POST /run/chain` |
| `runSpawn({ body?, code?, template?, capabilities, depth? })` | `POST /run/spawn` |
| `runGenerate({ prompt, capabilities, template? })` | `POST /run/generate` |
| `seed()` | `POST /seed` |
| `getTrace(id)` | `GET /t/:id` |
| `getTraceJson(id)` | `GET /t/:id.json` (same document) |

Use **`body`** for guest JavaScript; **`code`** is a legacy alias. Optional **`template`**: `guest@v1` (default).

Optional `fetch` in `createLabClient({ baseUrl, fetch })` for tests or custom runtimes.

**Effect:** `import { createLabEffectClient, HttpError } from "@acoyfellow/lab/effect"` (peer dependency `effect`). Same methods, `Effect`-returning.

### Errors

Non-2xx responses with a **JSON body** are parsed and returned (not thrown), matching the SvelteKit app’s worker proxy. Only non-JSON bodies throw.

## Local dev (monorepo)

From the [lab](https://github.com/acoyfellow/lab) repo, with `bun dev` running, the Worker listens on **`http://localhost:1337`**. Use:

```ts
createLabClient({ baseUrl: process.env.LAB_URL ?? "http://localhost:1337" });
```

Smoke from the monorepo: `LAB_URL` = your origin, then `bun run dogfood:lab` (sandbox + chain, `traceId`, `getTrace`, `getTraceJson`; see main README **Tests and CI**).

## Full docs

Endpoint details and curl: [github.com/acoyfellow/lab](https://github.com/acoyfellow/lab). Capability matrix (bindings, tradeoffs): README **Capabilities** section and **`/docs/capabilities`** on a running deploy.

## License

MIT
