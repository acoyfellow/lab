# Agents and lab

**0.0.1:** ship a **stdio MCP** with exactly two tools — **`find`** and **`execute`** — for Cursor and other MCP hosts. Implementation: monorepo [`packages/lab-mcp`](https://github.com/acoyfellow/lab/tree/main/packages/lab-mcp) (Effect **v4 beta** + `@modelcontextprotocol/sdk`). **HTTP** remains the wire format to the Worker.

## MCP (recommended)

- **Tools:** `find` — full `GET /lab/catalog`, optional dot-path slice (`execute.chain`, `capabilities`, …), or `traceId` → `GET /t/:id.json`. `execute` — discriminated `mode`: `sandbox` | `kv` | `chain` | `spawn` | `generate` | `seed` with the same fields as [`createLabClient`](https://www.npmjs.com/package/@acoyfellow/lab).
- **Env:** `LAB_URL` required (origin with `/run/*`, `/lab/catalog`, `/t/:id`).
- **Run:** from repo root, `bun run mcp:lab` (stdio). **Cursor:** merge something like [`docs/cursor-mcp-lab.example.json`](https://github.com/acoyfellow/lab/blob/main/docs/cursor-mcp-lab.example.json) into your MCP config; fix `args` `--cwd` to your clone path.

## Lookup

- **Worker origin:** `GET /lab/catalog` — JSON with `capabilities` (ids, `llmHint`, summaries), `templates`, `execute` (paths + body field names), `trace`, `seed`.
- **Site origin (proxied):** `GET /lab/catalog` on the Svelte app hits the Worker the same way trace JSON does.

Use this so models (or tool runners) do not scrape prose docs.

## Execute

- `POST /run`, `/run/kv`, `/run/chain`, `/run/spawn`, `/run/generate` — see [HTTP API](/docs/http-api).
- Persisted runs: `traceId` then `GET /t/:id` or `GET /t/:id.json` on the Worker.

## TypeScript

**Promises:**

```ts
import { fetchLabCatalog, createLabClient } from "@acoyfellow/lab";

const baseUrl = process.env.LAB_URL ?? "http://localhost:1337";
const catalog = await fetchLabCatalog({ baseUrl });
const lab = createLabClient({ baseUrl });
// … model fills `body` / chain steps from catalog.hints; lab.runSandbox / runChain / …
```

**Effect (same as MCP host internally):** `fetchLabCatalogEffect`, `createLabEffectClient`, `HttpError` from `@acoyfellow/lab/effect` with peer `effect@4.0.0-beta.40`.

## Security

Catalog is public if `/run` is public. Lock down with Cloudflare Access, private Worker URL, or ship catalog only on internal deploys.
