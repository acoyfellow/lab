# lab — Handoff

## What this is

Effect + Cloudflare Worker Loaders. Spawn sandboxed V8 isolates at runtime from a string of code. Control what each isolate can do with typed capabilities. The cheapest parallel compute primitive that exists — millisecond startup, near-zero cost, perfect for fan-out agent work.

Repo: https://github.com/acoyfellow/lab
Live: https://lab.coy.workers.dev
Local dev: `npx wrangler dev --port 8787`
Deploy: push to main → GitHub Actions → Cloudflare

## What's done

### Phase 1: Effect Service for Worker Loader ✅

`src/Loader.ts` — `Isolate` service wrapping the `LOADER` binding.

- `Isolate.run(code)` returns `Effect<unknown, IsolateError>`
- `IsolateError` tagged with reason: `timeout | sandbox_violation | runtime | capability_denied`
- `globalOutbound: null` — isolate can't touch the network
- `Effect.fn` on all effectful helpers: `hash`, `snapshotKv`, `parseIsolateResponse`, `Isolate.run`
- Service identifiers prefixed `@lab/`
- Code hashed via SHA-256, Loader caches by ID

Endpoint: `POST /run` with `{ code: string }`

### Phase 2: Capabilities as Types ✅

`src/Capability.ts` — `KvRead` capability as a `Context.Tag`.

- `KvRead` service: `get(key)` and `list(prefix?)`
- `CapabilitySet` type: `{ kvRead?: ... }` — only included capabilities get injected
- KV data is **snapshot at spawn time** and baked into the isolate as JSON (no outbound needed)
- Without capability: `kv.list()` → proxy throws → `IsolateError { reason: "capability_denied" }`
- With capability: `kv.list()` → reads from injected snapshot → works
- Tabbed web UI with capability badges (green = granted, red = denied)

Endpoints:
- `POST /run` — no capabilities (sandbox only)
- `POST /run/kv` — KvRead granted
- `POST /seed` — seeds demo KV data (Alice/Bob/Carol users)

## What's next

### Phase 3: Capability Chains

Multiple isolates in sequence, each with different trust levels.

```typescript
const chain = pipe(
  Isolate.run(userCode, {}),                              // untrusted, no caps
  Effect.flatMap(raw => Isolate.run(validatorCode, {})),   // has schema, no I/O
  Effect.flatMap(valid => Isolate.run(enricherCode, { kvRead })),  // can read KV
  Effect.flatMap(enriched => Isolate.run(writerCode, { d1Write })) // can write D1
)
```

Needs:
- Add `KvWrite` and `D1Write` capability tags to `Capability.ts`
- Add `POST /run/chain` endpoint
- Update `wrangler.jsonc` to add D1 binding
- New UI tab showing the chain executing step by step (show each isolate's input/output)
- The chain is interruptible, retryable, and observable via Effect

### Phase 4: Generated Compute

LLM writes the code that runs in the isolate.

- Add Workers AI binding (`@cf/meta/llama-3.1-8b-instruct` or similar)
- `POST /run/generate` — takes `{ prompt, capabilities }` in English
- Workers AI generates an async function body
- Code gets normalized (strip markdown fences, wrap in async IIFE — see Cloudflare codemode's `acorn` approach)
- Runs in isolate with only the stated capabilities
- New `AiComplete` capability tag
- UI tab: describe what you want, see generated code + output

Key insight from research: "LLMs are better at writing code than calling tools — they've seen millions of lines of real-world code but only contrived tool-calling examples." (Cloudflare codemode README)

### Phase 5: Recursive Spawning with Attenuation

An isolate that can spawn child isolates, each with fewer capabilities.

```typescript
class Spawn extends Context.Tag("@lab/Spawn")<Spawn, {
  readonly child: (code: string, caps: CapabilitySet) => Effect.Effect<unknown, IsolateError>
}>() {}

type AttenuatedCapabilities = {
  readonly budget: Duration
  readonly depth: number          // decremented each level
  readonly capabilities: CapabilitySet  // subset of parent's
}
```

- `Spawn` is itself a capability — if it's not in your set, you can't spawn
- Each child gets: less time, fewer capabilities, decremented depth
- When depth = 0, `Spawn` is removed from the capability set → recursion stops
- UI tab: shows spawn tree, capability attenuation at each level
- Fork bomb prevention is structural, not a quota check

### Parallel fan-out (unlocked by Phase 1-2, formalized here)

The same `Isolate.run()` call composes with `Effect.all`:

```typescript
const results = yield* Effect.all(
  [isolate.run(taskA, { kvRead }), isolate.run(taskB, { kvRead }), isolate.run(taskC, {})],
  { concurrency: "unbounded" }
)
```

Three isolates, different capabilities, running simultaneously. This is the core value prop: the cheapest way to parallelize sandboxed agent work.

## Architecture

```
lab/
├── src/
│   ├── index.ts          # Worker entrypoint, routing, Effect→Response
│   ├── Loader.ts         # Isolate service, IsolateError, wrapCode, makeIsolateLive
│   ├── Capability.ts     # KvRead tag, CapabilitySet type
│   ├── ui.html           # Tabbed web UI (separate file, imported as text)
│   └── env.d.ts          # *.html module declaration
├── wrangler.jsonc        # Worker config: LOADER binding, KV namespace
├── PLAN.md               # Full vision doc with research context
├── package.json          # effect, @cloudflare/workers-types, wrangler
└── .github/workflows/deploy.yml  # push to main → wrangler deploy
```

Key bindings in `wrangler.jsonc`:
- `LOADER` — Worker Loader (closed beta)
- `KV` — KV namespace (id: `ac980853c9124c97aa517432bc6b8b95`)

## Effect patterns (per effect.solutions)

- `Context.Tag` for services (not `ServiceMap.Service` — that's unreleased in effect@3.21.0)
- `Data.TaggedError` for errors (not `Schema.TaggedErrorClass` — different constructor in 3.21.0)
- `Effect.fn("name")(function* (...) { })` for call-site tracing on all effectful functions
- `Effect.gen(function* () { })` for sequencing
- `Effect.tryPromise({ try, catch })` for Promise interop with typed errors
- `Effect.promise()` when failure is not expected
- `Effect.provide(layer)` to inject capabilities
- `@lab/` prefix on all service identifiers
- No `let` mutations inside `Effect.gen` — use conditional expressions or yield early
- `Layer.succeed` for synchronous service construction

## Research context

Full research docs saved at:
- `/home/exedev/coey-dev-blog/research-generated-compute.md` — who's building LLM-generated compute (Cloudflare codemode, executor, E2B, Val Town, CodeAct paper, LATM, Voyager)
- `/home/exedev/coey-dev-blog/RESEARCH-recursive-infrastructure.md` — who's building self-spawning infra (Cloudflare, Temporal, Erlang, agent frameworks, the cost curve argument)

Key findings:
- **Cloudflare codemode** (`@cloudflare/codemode` v0.3.0) is closest to what we're building. Uses `WorkerLoader` + RPC proxies. We use Effect types instead of proxies.
- **executor** (RhysSullivan) is the open-source local-first attempt. QuickJS sandbox. No cloud deploy.
- **Nobody has capability chains** — composing isolates with different trust levels at runtime.
- **Nobody has tool caching** — Effect programs are values, hashable, cacheable. We get this for free.
- **Nobody has type-level attenuation** — fork bomb prevention via absence of a type, not a quota.
- **The gap is in the LIGHT + DYNAMIC quadrant** — cheap, fast, sandboxed compute spawned at runtime from arbitrary code with capability attenuation.

## Secrets & config

GitHub repo secrets (already set):
- `CLOUDFLARE_API_TOKEN`: `57xr8MW1ForH6uKV4Wpc7xY5b7ZyFRZk4RhILiCy`
- `CLOUDFLARE_ACCOUNT_ID`: `bfcb6ac5b3ceaf42a09607f6f7925823`

Worker Loader is in closed beta — Jordan has access.

## The thesis (one paragraph)

Worker Loaders are the cheapest spawn primitive that exists. Effect is the best way to describe what a program needs before it runs. Connect them: an Effect program declares its capabilities as types, a Loader runs it in a sandboxed isolate with exactly those capabilities. The type system is the sandbox. Compose isolates into chains (sequential) or fan-outs (parallel). Let LLMs generate the code. Let isolates spawn isolates with attenuating capabilities. The result is typed, composable, observable, cacheable dynamic compute — and nobody else is building it this way.
