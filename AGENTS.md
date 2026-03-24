# AGENTS.md

## Cursor Cloud specific instructions

Single Cloudflare Worker application -- no microservices, no Docker, no database.

### Commands

See `package.json` scripts:
- **Type check:** `bun run check` (runs `tsc --noEmit`)
- **Dev server:** `CLOUDFLARE_API_TOKEN=dummy bunx wrangler dev --port 8787 --show-interactive-dev-session false --local`
- **Deploy:** `bun run deploy` (requires real Cloudflare credentials)

### Dev server caveats

- `wrangler dev` requires `CLOUDFLARE_API_TOKEN` in non-interactive environments (Cloud Agent VMs). Use `CLOUDFLARE_API_TOKEN=dummy` with `--local` flag to run fully locally.
- `--show-interactive-dev-session false` is required since there is no TTY.
- `--local` disables remote AI binding (Workers AI on `/run/generate` won't work locally). All other endpoints (`/run`, `/run/kv`, `/run/chain`, `/run/spawn`, `/seed`) work fully locally.
- Bun is the package manager (lockfile: `bun.lock`). Install via `bun install`.

### No lint or test suite

This project has no ESLint config or test framework. The only static check is `bun run check` (TypeScript).
