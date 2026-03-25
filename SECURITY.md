# Security Policy

## Reporting a Vulnerability

If you believe you’ve found a security issue in **lab**, please report it privately.

- **Preferred**: GitHub Security Advisories (open a private report)
- **Alternative**: email `security@coey.dev`

Please include:

- A clear description of the issue and impact
- Steps to reproduce (PoC if possible)
- Affected versions / commits
- Any suggested fix or mitigation

## Scope

Security reports are most helpful when they include clear impact on:

- Guest isolation / sandbox escapes
- Capability boundary bypasses (e.g. `invoke/*`, `spawn`, snapshot shims)
- Auth/session issues (SvelteKit app, Better Auth integration)
- Trace data leakage / cross-tenant reads
- Supply chain or CI compromise

## Disclosure

We’ll acknowledge receipt, investigate, and ship a fix. If you want public credit, say so in the report.

