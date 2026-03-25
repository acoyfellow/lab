<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
</script>

# Agents and lab

**0.0.1:** no bundled stdio MCP server. Integrators use **HTTP**: one **lookup** GET, then existing **execute** POSTs (same as humans via [`createLabClient`](https://www.npmjs.com/package/@acoyfellow/lab)).

## Lookup

- **Worker origin:** `GET /lab/catalog` — JSON with `capabilities` (ids, `llmHint`, summaries), `templates`, `execute` (paths + body field names), `trace`, `seed`.
- **Site origin (proxied):** `GET /lab/catalog` on the Svelte app hits the Worker the same way trace JSON does.

Use this so models (or tool runners) do not scrape prose docs.

## Execute

- `POST /run`, `/run/kv`, `/run/chain`, `/run/spawn`, `/run/generate` — see [HTTP API](/docs/http-api).
- Persisted runs: `traceId` then `GET /t/:id` or `GET /t/:id.json` on the Worker.

## TypeScript

```ts
import { fetchLabCatalog, createLabClient } from "@acoyfellow/lab";

const baseUrl = process.env.LAB_URL ?? "http://localhost:1337";
const catalog = await fetchLabCatalog({ baseUrl });
const lab = createLabClient({ baseUrl });
// … model fills `body` / chain steps from catalog.hints; lab.runSandbox / runChain / …
```

## Security

Catalog is public if `/run` is public. Lock down with Cloudflare Access, private Worker URL, or ship catalog only on internal deploys.

---

<DocFooterNav
  gridClass="sm:grid-cols-2"
  links={[
    { label: 'HTTP API', to: '/docs/http-api', description: 'Endpoints and curl.' },
    { label: 'TypeScript client', to: '/docs/typescript', description: 'createLabClient, fetchLabCatalog.' },
  ]}
/>
