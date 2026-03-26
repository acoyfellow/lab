# `@acoyfellow/lab-mcp`

MCP (Model Context Protocol) server for [lab](https://github.com/acoyfellow/lab) — expose chainable edge execution to Claude Desktop, Cursor, or any MCP client.

## Install

```bash
npm install -g @acoyfellow/lab-mcp
```

## Usage

Set `LAB_URL` to your deployed lab Worker, then run the MCP server:

```bash
export LAB_URL=https://your-lab.workers.dev
lab-mcp
```

### Claude Desktop Config

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": {
        "LAB_URL": "https://your-lab.workers.dev"
      }
    }
  }
}
```

### Cursor Config

Add to Cursor MCP settings:

```json
{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": {
        "LAB_URL": "https://your-lab.workers.dev"
      }
    }
  }
}
```

## Tools

### `find`

Discover the lab API or retrieve traces.

**Input:**
- `path` (optional): Dot-path into catalog (e.g., `capabilities`, `execute.chain`)
- `traceId` (optional): Retrieve specific trace by ID

**Example:**
```json
{ "path": "capabilities" }
```

### `execute`

Run guest code on the lab Worker.

**Modes:**
- `sandbox`: Single isolate run
- `kv`: Run with KV read capability
- `chain`: Multi-step pipeline
- `spawn`: Nested isolates
- `generate`: AI-generated code
- `seed`: Seed demo KV data

**Example:**
```json
{
  "mode": "sandbox",
  "body": "return { hello: 'world' }",
  "capabilities": []
}
```

## Requirements

- Node.js 18+
- `LAB_URL` environment variable pointing to your lab deployment

## License

MIT
