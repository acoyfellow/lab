# Using Lab from an agent

Lab works with any agent that can make HTTP requests or use MCP tools. Here's how to connect.

## MCP (recommended for Cursor, Claude Code, etc.)

The `@acoyfellow/lab-mcp` package gives your agent two tools:

- **`find`** — browse available permissions, look up past run results, or explore the API
- **`execute`** — run code in a sandbox, run multi-step pipelines, generate code from a prompt

### Setup

```bash
npm install -g @acoyfellow/lab-mcp
```

Set `LAB_URL` to your Lab app origin (for example, the public app URL from your self-hosted deploy).

**Cursor:** merge the example config from [`docs/cursor-mcp-lab.example.json`](https://github.com/acoyfellow/lab/blob/main/docs/cursor-mcp-lab.example.json) into your MCP settings. Update `--cwd` to point to your clone.

**From the repo:** `bun run mcp:lab` starts the MCP server over stdio.

## TypeScript client

```ts
import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: process.env.LAB_URL ?? "$LAB_URL",
});

// Run a single piece of code
const result = await lab.runSandbox({ body: "return 1 + 1" });

// Run a multi-step pipeline
const chain = await lab.runChain([
  { body: "return [1, 2, 3]", capabilities: [] },
  { body: "return input.map(n => n * n)", capabilities: [] },
]);
```

An [Effect](https://effect.website) variant is also available — `import { createLabEffectClient } from "@acoyfellow/lab/effect"`.

## Plain HTTP

Any agent that can make HTTP requests can use Lab directly against the public app origin:

```bash
curl -X POST $LAB_URL/run \
  -H 'Content-Type: application/json' \
  -d '{"body": "return 1 + 1"}'
```

See [HTTP API](/docs/http-api) for all endpoints.

## Auto-discovery

`GET /lab/catalog` returns a machine-readable JSON document describing all available capabilities, endpoints, and how to call them. Point your agent at this URL instead of hardcoding API details.

## Security

The catalog is public if your Lab instance is public. To restrict access, use Cloudflare Access, a private Worker URL, or only expose the catalog on internal deploys.
