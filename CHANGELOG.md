# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning intent: **0.0.x is experimental** — API surfaces, trace shapes, and HTTP contracts may move without treating every change as semver-breaking until a **1.0** story exists.

## [Unreleased]

Nothing yet.

## [0.0.1] - 2026-03-26

First published **0.0.x** line: public demo and integration surface, not a stability promise.

### Added

- **Edge runtime:** chainable guest JavaScript on Cloudflare **Worker Loaders**; per-step **capabilities** (KV, spawn, Workers AI, R2, D1, Durable Objects, containers, etc.).
- **Runs:** sandbox, KV, chain, spawn, generate; persisted **traces** with shareable `traceId` (`GET /t/:id`).
- **Clients:** [`@acoyfellow/lab`](packages/lab) npm package; **`@acoyfellow/lab-mcp`** (stdio MCP: catalog + execute).
- **Site:** Compose, Examples (fork to Compose via `sessionStorage`), docs (HTTP API, architecture, limits, security, failures, FAQ, etc.).

### Notes

- Prefer **[README](README.md)** for install, CI, and philosophy; this file tracks **what changed between tags**, not full product spec.
