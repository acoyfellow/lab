# Contributing

Thanks for helping improve **lab**.

## Quick start

```bash
bun install
bun dev
```

- App runs on `http://localhost:5173`
- Worker runs on `http://localhost:1337`

## What to work on

High-signal contributions:

- Capability boundaries / sandbox correctness
- Chain + spawn ergonomics
- Trace schema clarity (for humans + machines)
- Docs that make self-hosting and integration obvious

## Development commands

| Command | What it does |
| --- | --- |
| `bun test` | Unit tests |
| `bun run lint` | oxlint (`--deny-warnings`) |
| `bun run check` | typecheck + svelte-check + package builds |
| `bun run dogfood:lab` | smoke run against `LAB_URL` (defaults to `http://localhost:1337`) |

## PRs

- Keep changes small and reviewable
- Prefer shipping working, boring code over abstractions
- If you add a new capability surface:
  - Update the capability registry + docs
  - Include the security / boundary rationale

## Conduct

By participating, you agree to `CODE_OF_CONDUCT.md`.

