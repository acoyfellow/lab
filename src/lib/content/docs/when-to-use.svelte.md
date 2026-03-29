# When to use Lab

## Good fit

- **Chainable guest JavaScript** on the edge with **per-step** permission sets.
- **Trace-first** debugging: you want a persisted document per run with inputs/outputs for inspection and sharing.
- **HTTP or agent** control planes: [HTTP API](/docs/http-api), [MCP / catalog](/docs/agent-integration), or both.

## Poor fit

- **Long-running task queues** where jobs churn for minutes or run in the background. Workers CPU limits and the sandbox model are the wrong shape. Try [Chomp](https://github.com/acoyfellow/chomp) for agent task queues.
- **Full system access** (filesystem, raw sockets, shell commands, browser automation). Lab runs in a locked-down sandbox on purpose. Try [Cloudshell](https://github.com/acoyfellow/cloudshell) for terminal access or [Filepath](https://github.com/acoyfellow/filepath) for a full dev environment.
- **Persistent memory across runs.** Lab runs are stateless — each one starts fresh. If agents need to learn from previous runs and recall that knowledge later, use [Deja](https://github.com/acoyfellow/deja) alongside Lab.
- **E2E browser testing** with assertions against live UI. Lab proves code ran correctly; [Gateproof](https://github.com/acoyfellow/gateproof) proves the UI works correctly.
- **One large trusted monolith** with no need for untrusted code or per-step permissions — plain [Cloudflare Workers](https://developers.cloudflare.com/workers/) or your existing stack may be simpler.

## Relationship to “plain” Workers

Lab **orchestrates** Loader isolates, capabilities, and traces. It does not replace Workers; it **depends** on them. See [Architecture](/docs/architecture) for loaders, KV snapshots, spawn, and `/invoke/*`.
