# When to use Lab

## Good fit

- **Chainable guest JavaScript** on the edge with **per-step** permission sets.
- **Trace-first** debugging: you want a persisted document per run with inputs/outputs for inspection and sharing.
- **HTTP or agent** control planes: [HTTP API](/docs/http-api), [MCP / catalog](/docs/agent-integration), or both.

## Poor fit

- **Long CPU-heavy batch jobs** where a single process should churn for minutes—Workers CPU limits and the isolate model are the wrong default; use batch elsewhere or split work explicitly.
- **Arbitrary system access** (full filesystem, raw sockets, unrestricted outbound). Lab is built around **declared capabilities** and Loader isolates—not a general-purpose server.
- **One large trusted monolith** with no need for untrusted code or per-step attenuation—plain [Cloudflare Workers](https://developers.cloudflare.com/workers/) or your existing stack may be simpler.

## Relationship to “plain” Workers

Lab **orchestrates** Loader isolates, capabilities, and traces. It does not replace Workers; it **depends** on them. See [Architecture](/docs/architecture) for loaders, KV snapshots, spawn, and `/invoke/*`.
