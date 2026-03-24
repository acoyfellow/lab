# TypeScript client

`@acoyfellow/lab` is a typed HTTP client for a deployed Worker origin. It does not install Cloudflare tooling or deploy this repo. Prerequisite: a running lab Worker (see [HTTP API](/docs/http-api)).

```
npm install @acoyfellow/lab
```

Point `baseUrl` at that origin:

```
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL ?? "https://lab.coey.dev",
});

const out = await lab.runChain([
  { code: "return [1, 2, 3]", capabilities: [] },
  { code: "return input.map((n: number) => n * n)", capabilities: [] },
]);
```

Methods: `runSandbox`, `runKv`, `runChain`, `runSpawn`, `runGenerate`, `seed`, `getTrace` — each maps to [HTTP API](/docs/http-api) endpoints.

**Non-2xx:** JSON may still be parsed into error-shaped bodies (same as the app proxy); `fetch` might not throw.

**Monorepo:** `bun run build:client` builds `packages/lab` to `packages/lab/dist`. Publishing to npm is a separate maintainer step.

**Local dogfood:** Worker dev is pinned to port 1337 with the app proxy. Use `LAB_URL=http://localhost:1337` with `bun run dogfood:lab` after `bun run build:client`.

---

[Docs](/docs) · [Package source (GitHub)](https://github.com/acoyfellow/lab/tree/main/packages/lab)
