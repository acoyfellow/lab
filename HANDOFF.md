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

### Phase 3: Capability Chains ✅

Multiple isolates in sequence, each with different trust levels.

- `POST /run/chain` endpoint: takes `{ steps: [{ code, capabilities }] }`, runs sequentially
- Each step's output feeds as `input` to the next step's isolate code
- `Isolate.run(code, caps, input)` — input parameter added to service interface
- Input baked into isolate hash so cached isolates don't serve stale results
- `Effect.reduce` over steps for clean sequential composition without let mutation
- Trace output: `{ step, capabilities, input, output, ms }` per step
- UI tab "03: chain" with demo: Reader (kvRead) → Validator (no caps) → Formatter (no caps)
- Step-by-step trace visualization: side-by-side input/output, capability badges, timing, arrows
- Demo chain: reads all KV users → filters to admins → formats summary string
- Total chain time ~150ms for 3 isolates

Endpoint: `POST /run/chain` with `{ steps: Array<{ code: string, capabilities: string[] }> }`

### Phase 4: Generated Compute ✅

LLM writes the code that runs in the isolate.

- Workers AI binding (`@cf/meta/llama-3.1-8b-instruct`) added to `wrangler.jsonc`
- `POST /run/generate` — takes `{ prompt, capabilities }` in English
- System prompt adapts based on granted capabilities (tells LLM what APIs are available)
- Code normalization: strip markdown fences, unwrap IIFE, auto-prepend return to last expression
- Prompt engineering: no .then() chains, top-level return, no wrapping in async functions
- Response includes generated code, generate time, and run time for transparency
- UI tab "04: generate" with prompt textarea and capability checkboxes
- Generated code displayed below output so user can see what the LLM wrote
- Generate: ~500ms-14s (depends on cold start), Run: 3-5ms

Endpoint: `POST /run/generate` with `{ prompt: string, capabilities: string[] }`

## What's next

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
