<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# TypeScript client

`@acoyfellow/lab` is a typed HTTP client. It does not install Cloudflare tooling or deploy this repo.

**Guest `code` in JSON bodies:** still **JavaScript** in the isolate; only your *caller* is TypeScript.

**Integrator vs operator:** Your app only needs **`baseUrl`** — the HTTP **origin** that serves `POST /run/*`, `GET /t/:id`, and `POST /seed`. Cloudflare tokens and other deploy secrets are for whoever operates the Worker, not for `createLabClient`.

**Prerequisite:** That origin is reachable from your runtime (your [self-hosted deploy](https://github.com/acoyfellow/lab#self-host), local dev, or a public demo). Endpoint details: [HTTP API](/docs/http-api).

```
npm install @acoyfellow/lab
```

Set `baseUrl` to **your** deployed origin (not tied to a single vendor host):

```
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL ?? "https://your-lab-origin.example",
});

const out = await lab.runChain([
  { code: "return [1, 2, 3]", capabilities: [] },
  { code: "return input.map((n) => n * n)", capabilities: [] },
]);
```

In the default monorepo layout, the public **site** proxies run/trace routes to the Worker, so **`baseUrl` often equals the same hostname as the UI**. If the Worker is on its own public URL, use that.

Methods: `runSandbox`, `runKv`, `runChain`, `runSpawn`, `runGenerate`, `seed`, `getTrace` — each maps to [HTTP API](/docs/http-api) endpoints.

**Non-2xx:** JSON may still be parsed into error-shaped bodies (same as the app proxy); `fetch` might not throw.

**Monorepo:** `bun run build:client` builds `packages/lab` to `packages/lab/dist`. Publishing to npm is a separate maintainer step.

**Smoke:** From the repo root, `LAB_URL=https://your-origin.example bun run dogfood:lab` runs [`scripts/dogfood-lab.ts`](https://github.com/acoyfellow/lab/blob/main/scripts/dogfood-lab.ts) (sandbox + chain + `traceId` + `getTrace`). Local dev: `bun dev` then default `LAB_URL=http://localhost:1337`.

---

<DocFooterNav
  gridClass="sm:grid-cols-2"
  links={[
    { label: 'Docs', to: '/docs', description: 'Hub and related reference.' },
    {
      label: 'npm package',
      href: 'https://www.npmjs.com/package/@acoyfellow/lab',
      description: 'Published client on the registry.',
    },
  ]}
/>
