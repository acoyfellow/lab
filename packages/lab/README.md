# `@acoyfellow/lab`

Typed HTTP client for the [lab](https://github.com/acoyfellow/lab) Worker API: sandboxed isolates, capability chains, KV read, spawn, generate, seed, and trace retrieval.

## Install

```bash
npm install @acoyfellow/lab
```

Requires **Node 18+** (global `fetch`) or any runtime that provides `fetch` (Cloudflare Workers, Deno, Bun).

## Usage

Set `baseUrl` to your deployed lab origin (see the main repo [README](https://github.com/acoyfellow/lab#readme) for deploy steps).

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "https://lab.coey.dev" });

const r = await lab.runSandbox('return { hello: "world" }');
```

### API

| Method | HTTP |
|--------|------|
| `runSandbox(code)` | `POST /run` |
| `runKv(code)` | `POST /run/kv` |
| `runChain(steps)` | `POST /run/chain` |
| `runSpawn({ code, capabilities, depth? })` | `POST /run/spawn` |
| `runGenerate({ prompt, capabilities })` | `POST /run/generate` |
| `seed()` | `POST /seed` |
| `getTrace(id)` | `GET /t/:id` |

Optional `fetch` in `createLabClient({ baseUrl, fetch })` for tests or custom runtimes.

### Errors

Non-2xx responses with a **JSON body** are parsed and returned (not thrown), matching the SvelteKit app’s worker proxy. Only non-JSON bodies throw.

## Local dev (monorepo)

From the [lab](https://github.com/acoyfellow/lab) repo, with `bun dev` running, the Worker listens on **`http://localhost:1337`**. Use:

```ts
createLabClient({ baseUrl: process.env.LAB_URL ?? "http://localhost:1337" });
```

Or run `bun run dogfood:lab` at the repo root (see main README).

## Full docs

Endpoint details, curl examples, and capabilities: [github.com/acoyfellow/lab](https://github.com/acoyfellow/lab).

## License

MIT
