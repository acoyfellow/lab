# TypeScript client

The `@acoyfellow/lab` package lets you run code on Lab from any JavaScript or TypeScript project.

```
npm install @acoyfellow/lab
```

## Quick start

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL ?? "https://your-lab-instance.example",
});

const out = await lab.runChain([
  { body: "return [1, 2, 3]", capabilities: [] },
  { body: "return input.map((n) => n * n)", capabilities: [] },
]);
```

`baseUrl` is the public app origin for your Lab instance — either your [self-hosted deploy](/docs/install) or another public Lab app. If you're running the monorepo locally, that's `http://localhost:5173`.

## What you can do

| Method | What it does | See |
|---|---|---|
| `runSandbox(opts)` | Run a single piece of code | [POST /run](/docs/http-api#post-run) |
| `runKv(opts)` | Run code with KV storage access | [POST /run/kv](/docs/http-api#post-runkv) |
| `runChain(steps)` | Run a multi-step pipeline | [POST /run/chain](/docs/http-api#post-runchain) |
| `runSpawn(opts)` | Run code that can launch nested sandboxes | [POST /run/spawn](/docs/http-api#post-runspawn) |
| `runGenerate(opts)` | Have an AI write and run code from a prompt | [POST /run/generate](/docs/http-api#post-rungenerate) |
| `seed()` | Load demo data into KV | [POST /seed](/docs/http-api#post-seed) |
| `getResult(id)` | Fetch canonical saved-result JSON | [GET /results/:id.json](/docs/http-api#get-resultsidjson) |

## Important notes

**Your code is JavaScript.** The `body` field is plain JavaScript that runs inside the sandbox. Only your *calling* code needs TypeScript.

**You don't need Cloudflare credentials.** The client just needs a `baseUrl`. Cloudflare tokens and deploy secrets are for whoever hosts the Lab Worker, not for you.

**Error responses.** Non-2xx responses may still return JSON with error details. The client doesn't throw on HTTP errors — check the response.

## Auto-discovery for agents

```ts
import { fetchLabCatalog } from "@acoyfellow/lab";

const catalog = await fetchLabCatalog({ baseUrl });
// → permissions, endpoints, hints for LLMs
```

## Effect variant

If you use [Effect](https://effect.website):

```ts
import { createLabEffectClient, fetchLabCatalogEffect } from "@acoyfellow/lab/effect";
```

Same API, but methods return `Effect` values instead of promises. Requires `effect@4.0.0-beta.40` as a peer dependency.
