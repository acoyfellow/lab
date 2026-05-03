# `@acoyfellow/lab`

Typed client and local run spine for [Lab](https://github.com/acoyfellow/lab): repo runs, receipts, sandboxed isolates, capability chains, and saved results.

> **0.0.3** — early feedback. API may change.

## Install

```bash
npm install @acoyfellow/lab
```

Requires Node 18+ or any runtime with global `fetch` (Cloudflare Workers, Deno, Bun).

## Usage

### Repo Runs

```ts
import { createLabRun, listLabRuns } from "@acoyfellow/lab";

const run = await createLabRun({
  repo: { type: "local", path: process.cwd() },
  snapshot: { mode: "branch", prefix: "lab/run" },
  executor: { type: "local" },
  command: ["sh", "-lc", "bun test"],
});

console.log(run.receipt);
console.log(await listLabRuns({ root: process.cwd() }));
```

### Hosted API

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: "https://your-lab.example",
});

const r = await lab.runChain([
  { body: "return [1, 2, 3]", capabilities: [] },
  { body: "return input.map(n => n * 2)", capabilities: [] },
]);

console.log(r.result);  // [2, 4, 6]
```

`baseUrl` is the public app origin for Lab — either your deployed app hostname or your own self-hosted origin. See [Self-host](https://github.com/acoyfellow/lab#self-host).

## API

| Method | HTTP route |
|--------|------|
| `createLabRun(input)` | local package API |
| `listLabRuns({ root })` | local package API |
| `getLabRun(id, { root })` | local package API |
| `runSandbox({ body, capabilities? })` | `POST /run` |
| `runKv({ body, capabilities? })` | `POST /run/kv` |
| `runChain(steps)` | `POST /run/chain` |
| `runSpawn({ body, capabilities, depth? })` | `POST /run/spawn` |
| `runGenerate({ prompt, capabilities })` | `POST /run/generate` |
| `seed()` | `POST /seed` |
| `getResult(id)` | `GET /results/:id.json` |

`GET /results/:id` is the human viewer on the public app. Agents and scripts should read `GET /results/:id.json`.

Use `body` for guest JavaScript. `code` is a legacy alias. Default template: `guest@v1`.

**Effect client:** `import { createLabEffectClient } from "@acoyfellow/lab/effect"` — same methods, returns `Effect` instead of `Promise`. Peer dependency: `effect@4.0.0-beta.40`.

**Agent discovery:** `import { fetchLabCatalog } from "@acoyfellow/lab"` for capability hints and execute paths.

## Errors

Non-2xx responses with JSON bodies are parsed and returned (not thrown). Only non-JSON responses throw.

## Local dev

With `bun dev` running in the [Lab](https://github.com/acoyfellow/lab) repo:

```ts
createLabClient({ baseUrl: "http://localhost:5173" });
```

## License

MIT
