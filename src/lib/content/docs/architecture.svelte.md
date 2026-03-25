# Why this architecture

## The problem

You want to run untrusted code on Cloudflare. You want to control what that code can do. You want to compose multiple pieces of untrusted code into a pipeline where each piece has different permissions.

Cloudflare Worker Loaders solve the first part — they create V8 isolates at runtime from a string of code, with millisecond startup and near-zero cost. But they don't have a built-in permission model. An isolate either has `globalOutbound` (can make any request) or doesn't (can't make any request). There's nothing in between.

## The approach

This project uses Effect for isolate execution. **KV read** is modeled as an Effect `Context.Tag` service on the host; other capabilities (`spawn`, `workersAi`, `r2Read`, …) are flags on `CapabilitySet` that select Loader wrapper shims and/or host **`/invoke/*`** routes. The parent inspects the set before running an isolate and injects the right shims. A **bindings / tradeoffs table** for each guest string lives at [Capabilities](/docs/capabilities).

This means:

- **Capabilities are additive.** An isolate starts with nothing. You add what it needs.
- **Capabilities are visible.** You can see what an isolate can do by reading its capability set.
- **Capabilities are attenuating.** A child isolate can have fewer capabilities than its parent, never more.

## How KV read works without a binding

Cloudflare's `KVNamespace` object cannot be passed into a Worker Loader's `env` — the runtime throws a serialization error. The workaround: the parent reads all KV data into memory before creating the isolate, serializes it as JSON, and injects it into the isolate's wrapper code. The isolate gets `kv.get()` and `kv.list()` functions backed by that in-memory snapshot.

This has tradeoffs. The snapshot is a point-in-time copy. If KV changes between snapshot and execution, the isolate sees stale data. For the use cases this project targets (short-lived compute tasks), that's acceptable.

## How host invoke works (`/invoke/*`)

Some capabilities (`workersAi`, `r2Read`, `d1Read`, `durableObjectFetch`, `containerHttp`) cannot inject raw bindings into the Loader child. Those shims use the same **`SELF` `globalOutbound`** as spawn: the isolate calls `fetch("http://internal/invoke/…")`, the parent Worker handles `POST /invoke/*` with the real `AI`, `R2`, `ENGINE_D1`, `LAB_DO`, or `LAB_CONTAINER` bindings, and returns JSON the shim unwraps. Denied or unconfigured bindings surface as isolate errors or **503** on the host route.

## How spawn works

An isolate can't create other isolates directly — it doesn't have the `LOADER` binding. Instead, it makes a fetch request that routes back to the parent worker.

The mechanism: `wrangler.jsonc` declares a `SELF` service binding that points to the worker itself. When an isolate has the spawn capability, its `globalOutbound` is set to this `SELF` fetcher. The isolate's `spawn()` function calls `fetch("http://internal/spawn/child", ...)`, which the parent worker handles by creating a new isolate.

Depth is decremented at each level. At depth 0, the spawn shim throws synchronously instead of making a fetch request. No outbound is needed and the isolate can't work around it.

## How chains work

A chain is a sequence of isolates where each step's output becomes the next step's `input`. The parent runs them sequentially using `Effect.reduce` — each step is an Effect that yields the next input value.

Each step has its own capability set. The first step might have KV read. The second might have nothing. The third might have spawn. This is the "attenuating permissions" pattern applied sequentially.

The input is serialized as JSON and injected into the isolate's wrapper code, same as KV data. It's included in the isolate's hash key so cached isolates don't return stale results from a previous chain run.

## How code generation works

The `/run/generate` endpoint takes a natural language prompt and a capability list. It builds a system prompt that tells Workers AI what APIs are available (based on the granted capabilities), then runs the model. The generated code gets normalized:

1. Strip markdown fences (LLMs often wrap code in ` ```js ` blocks)
2. Unwrap async IIFE wrappers (the isolate already runs inside one)
3. Auto-prepend `return` to the last expression if there's no top-level return

The normalized code runs in a sandboxed isolate with the declared capabilities.

## What Worker Loaders are

Worker Loaders are a Cloudflare feature (closed beta) that lets a Worker create child V8 isolates at runtime. You provide:

- A module string (the code)
- An ID (used for caching — same ID reuses the same compiled isolate)
- Optional `env` bindings and `globalOutbound` fetcher

The isolate starts in single-digit milliseconds. It's the cheapest spawn primitive available on any cloud platform.

## What Effect provides

Effect is used for:

- **Service tags** (`Context.Tag`) — model capabilities as typed dependencies
- **Error types** (`Data.TaggedError`) — `IsolateError` with tagged reasons
- **Composition** (`Effect.gen`, `Effect.reduce`) — chain steps without mutable state
- **Tracing** (`Effect.fn`) — all effectful functions are named for observability
- **Promise interop** (`Effect.tryPromise`, `Effect.promise`) — wrap Cloudflare APIs

**Effect-first rule:** new behavior in the **Worker** (run paths, trace persistence, spawn/KV/generate) should stay in Effect pipelines (`Effect.gen`, `Exit`, `Cause`) like `worker/index.ts`. The Svelte app and HTTP client are thin layers over `fetch` and remote functions.

## Traces

After each persisted run, the Worker stores a `StoredTrace` JSON blob in KV under `trace:<id>` and returns `traceId` in the HTTP response. `GET /t/:id` serves that document. See [trace schema](/docs/trace-schema) for fields.
