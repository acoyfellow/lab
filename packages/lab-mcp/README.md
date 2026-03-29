# `@acoyfellow/lab-mcp`

MCP server for [Lab](https://github.com/acoyfellow/lab) — expose chainable edge execution to Claude Desktop, Cursor, or any MCP client.

## Quick setup

Add to your MCP config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": {
        "LAB_URL": "https://your-lab.example"
      }
    }
  }
}
```

Or install globally and run directly:

```bash
npm install -g @acoyfellow/lab-mcp
LAB_URL=https://your-lab.example lab-mcp
```

## Tools

### `find`

Discover capabilities and retrieve saved results.

- `path` (optional) — dot-path into catalog, e.g. `capabilities`, `execute.chain`
- `traceId` (optional) — fetch raw saved-result JSON for a specific id

### `execute`

Run guest code through Lab.

**Modes:** `sandbox` · `kv` · `chain` · `spawn` · `generate` · `seed`

```json
{
  "mode": "chain",
  "steps": [
    { "body": "return [1, 2, 3]", "capabilities": [] },
    { "body": "return input.map(n => n * 2)", "capabilities": [] }
  ]
}
```

## Requirements

- Node.js 18+
- `LAB_URL` environment variable

## License

MIT
