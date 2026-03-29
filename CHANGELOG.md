# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning intent: **0.0.x is experimental** — API surfaces, trace shapes, and HTTP contracts may move without treating every change as semver-breaking until a **1.0** story exists.

## [Unreleased]

Nothing yet.

## [0.0.2] - 2026-03-28

### Added

- **GitHub OAuth:** experiments require sign-in to play (LLM calls cost money); pages remain publicly viewable to entice sign-ups.
- **Versus experiment:** 1v1 Connect 4 — minimax with alpha-beta pruning handles tactics, a minimal LLM prompt breaks ties, and traced losses feed a DO SQLite learning loop. Expandable game history with trace links.
- **Drop Four experiment:** 6 AI personalities play a round-robin Connect 4 tournament in parallel isolates, then you challenge the winner.
- **Auth component:** reusable `AuthButton.svelte` — GitHub sign-in when unauthenticated, avatar + sign-out when authenticated.
- **Server-side auth guards:** `requireAuth()` on LLM-consuming RPCs (`runGenerate`, `seedKv`, `doSqlExec`). Cheap worker isolate calls (`runSandbox`, `runKv`, `runChain`, `runSpawn`) remain public.

### Fixed

- **`@acoyfellow/lab-cli`:** replaced removed `Effect.catchAll` with `Effect.catchCause` for Effect v4 beta compatibility.

### Changed

- **Homepage:** new headline — "Run code in isolation. Trace what happened." Clean 2×2 "Why traces" grid, "Patterns" section leading with Adaptive Opponent.
- **Site-wide layout audit:** unified page padding (`px-6 py-10`) and `h1` styles (`text-2xl tracking-tight`) across all subpages.
- **Docs sidebar:** merged "Guides" into "Start" — two nav groups instead of three.
- **Nav:** removed Tutorial and Guides from main nav; simplified footer to Build / Learn / Project.
- **Examples:** removed internal "Score" sort; tightened descriptions.
- **Experiments index:** concrete card descriptions grounded in what each experiment actually does.

## [0.0.1] - 2026-03-26

First published **0.0.x** line: public demo and integration surface, not a stability promise.

### Added

- **Edge runtime:** chainable guest JavaScript on Cloudflare **Worker Loaders**; per-step **capabilities** (KV, spawn, Workers AI, R2, D1, Durable Objects, containers, etc.).
- **Runs:** sandbox, KV, chain, spawn, generate; persisted **traces** with shareable `resultId` (`GET /results/:id`).
- **Clients:** [`@acoyfellow/lab`](packages/lab) npm package; **`@acoyfellow/lab-mcp`** (stdio MCP: catalog + execute).
- **Site:** Compose, Examples (fork to Compose via `sessionStorage`), docs (HTTP API, architecture, limits, security, failures, FAQ, etc.).

### Notes

- Prefer **[README](README.md)** for install, CI, and philosophy; this file tracks **what changed between tags**, not full product spec.
