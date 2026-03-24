# loader-lab: Effect-First Dynamic Compute

## The Thesis

Worker Loaders are the cheapest spawn primitive that exists. Effect is the best way to model typed, composable, interruptible programs. Nobody is combining them.

Cloudflare's codemode wraps isolates in ad-hoc RPC proxies. Executor wraps them in QuickJS with Proxy objects. Both are reinventing what Effect already solves: typed capabilities as dependencies, structured errors, interruption, resource scoping, and composable programs.

We're going to model dynamic isolates as Effect Services. A Loader becomes a `Layer`. A capability becomes a `Context.Tag`. A spawned isolate is an `Effect` that requires capabilities and produces results. The type system enforces what each isolate can do — not proxy hacks, not runtime blocks.

## Architecture

```
loader-lab/
├── src/
│   ├── index.ts              # Worker entrypoint + web UI
│   ├── Loader.ts             # Effect Service wrapping LOADER binding
│   ├── Capability.ts         # Capability types as Context.Tags
│   ├── Isolate.ts            # Isolate lifecycle as Effect programs
│   ├── Chain.ts              # Capability chain composition
│   └── experiments/          # Individual experiments
│       ├── 01-sandbox.ts     # Pure compute (no capabilities)
│       ├── 02-kv-reader.ts   # Read-only KV access
│       ├── 03-chain.ts       # Multi-isolate capability chain
│       ├── 04-generated.ts   # LLM generates the Effect program
│       └── 05-recursive.ts   # Isolate that spawns isolates
└── wrangler.jsonc
```

## Phase 1: Effect Service for Worker Loader

The foundation. Model the Loader binding as an Effect Service.

```typescript
import { Context, Effect, Layer } from "effect"

// The raw CF binding, as a tagged service
class LoaderBinding extends Context.Tag("LoaderBinding")<
  LoaderBinding,
  { readonly get: (id: string, cb: () => Promise<WorkerCode>) => WorkerStub }
>() {}

// Our abstraction: run code in an isolate
class Isolate extends Context.Tag("Isolate")<
  Isolate,
  {
    readonly run: <A>(
      code: string,
      capabilities?: CapabilitySet
    ) => Effect.Effect<A, IsolateError>
  }
>() {}

// Errors are typed, not strings
class IsolateError extends Data.TaggedError("IsolateError")<{
  readonly reason: "timeout" | "sandbox_violation" | "runtime" | "capability_denied"
  readonly message: string
  readonly code?: string
}> {}
```

Every experiment uses `Isolate.run()`. The implementation details (hashing, wrapping, Loader.get) are hidden behind the Effect Layer.

## Phase 2: Capabilities as Types

This is where it diverges from everything else. Capabilities aren't runtime config — they're types.

```typescript
// Each capability is a tagged service
class KvRead extends Context.Tag("KvRead")<KvRead, { readonly get: (key: string) => Effect.Effect<string | null> }>() {}
class KvWrite extends Context.Tag("KvWrite")<KvWrite, { readonly put: (key: string, value: string) => Effect.Effect<void> }>() {}
class NetFetch extends Context.Tag("NetFetch")<NetFetch, { readonly fetch: (url: string) => Effect.Effect<Response> }>() {}
class AiComplete extends Context.Tag("AiComplete")<AiComplete, { readonly complete: (prompt: string) => Effect.Effect<string> }>() {}

// A capability set is just the union of services an isolate requires
type ReadOnly = KvRead
type ReadWrite = KvRead | KvWrite
type Full = KvRead | KvWrite | NetFetch | AiComplete
```

When you spawn an isolate, the type signature tells you EXACTLY what it can do. If an isolate requires `KvWrite` but you only provide `KvRead`, it's a compile error. Not a runtime error. Not a proxy that throws. **A type error.**

The gap from the research: "nobody has per-tool-call authorization." Effect does this naturally. Each capability is a separate service. You compose only what you grant.

## Phase 3: Capability Chains

Multiple isolates, each with different trust levels, composed as an Effect pipeline.

```typescript
const chain = pipe(
  // Step 1: User code (untrusted). No capabilities.
  Isolate.run(userCode, {}),
  // Step 2: Validate output. Has schema, no I/O.
  Effect.flatMap(raw => Isolate.run(validatorCode, { schema: Schema })),
  // Step 3: Enrich. Can read KV, nothing else.
  Effect.flatMap(valid => Isolate.run(enricherCode, { kv: KvRead })),
  // Step 4: Write. Can write D1, nothing else.
  Effect.flatMap(enriched => Isolate.run(writerCode, { db: D1Write })),
)
```

Four isolates. Four type signatures. Each step's capabilities are visible in the types. The chain is an Effect program that can be interrupted, retried, timed out, observed — all for free.

This is the "Unix pipes but each segment has different permissions" idea, implemented as Effect composition. Nobody is doing this.

## Phase 4: Generated Compute via Effect

The LLM doesn't generate raw JS. It generates an Effect program. The research says "LLMs are better at writing code than calling tools." But nobody's asking: what if the code they write is *typed, composable, and capability-scoped by construction*?

```typescript
// The LLM sees this prompt:
// "Write an Effect program that reads user data from KV,
//  enriches it with AI, and writes to D1.
//  You have: KvRead, AiComplete, D1Write."

// The LLM generates:
const program = Effect.gen(function* () {
  const kv = yield* KvRead
  const ai = yield* AiComplete
  const db = yield* D1Write

  const user = yield* kv.get("user:123")
  const enriched = yield* ai.complete(`Summarize: ${user}`)
  yield* db.put("enriched:123", enriched)

  return { enriched }
})
```

The generated code CANNOT access anything not in its type signature. Not because of a proxy trap. Because Effect's type system won't let it compile. The sandbox is the type system.

Gap from research: "no tool caching / skill libraries." Effect programs are values. You can hash them, cache them, reuse them. Same program = same hash = cached isolate. The skill library is just a Map<Hash, Effect>.

## Phase 5: Recursive Spawning with Attenuation

An isolate that can spawn child isolates — but each child gets fewer capabilities.

```typescript
// Spawn is itself a capability
class Spawn extends Context.Tag("Spawn")<
  Spawn,
  {
    readonly child: <A>(
      code: string,
      capabilities: AttenuatedCapabilities
    ) => Effect.Effect<A, IsolateError>
  }
>() {}

// Attenuation is structural
type AttenuatedCapabilities = {
  readonly budget: Duration       // less time than parent
  readonly memory: number         // less memory than parent  
  readonly depth: number          // decremented each level
  readonly capabilities: CapabilitySet  // subset of parent's
}

// Fork bomb prevention is in the types:
// when depth reaches 0, Spawn is not in the capability set.
// The child literally cannot spawn. Type error.
```

Gap from research: "nobody has a built-in model for 'the child gets less than the parent.'" Effect's Layer system does this naturally. Each level provides a Layer with reduced capabilities. When budget is exhausted, the Spawn service is removed from the Layer. No spawn = no recursion = bottoms out.

## Experiments (the toys)

Each experiment is a standalone thing you can run from the web UI.

### 01: Pure Sandbox
Paste code. Run in isolate. No capabilities. Proves the Effect-Loader integration works.
(This is what we already built, but Effect-ified.)

### 02: KV Reader
Isolate gets read-only KV. Can query data. Cannot write. Cannot fetch.
Demonstrates single-capability granting.

### 03: Capability Chain
User input → Validator → Enricher → Writer. Four isolates, four trust levels.
The web UI shows the chain executing step by step.

### 04: LLM Generates an Effect Program
You describe what you want in English. Workers AI generates an Effect program.
The program runs in an isolate with only the capabilities the AI was told about.
If the AI tries to use a capability it wasn't given, type error. Not runtime error.

### 05: Recursive Spawner
An isolate that spawns child isolates. Each child has less budget.
The web UI shows the spawn tree, capability attenuation at each level,
and the point where recursion bottoms out.

## What Makes This Novel

1. **Effect as the sandbox.** Everyone uses runtime proxy traps or `globalOutbound: null` to restrict isolates. We use the type system. Capabilities that aren't in the type signature don't exist.

2. **Composition, not configuration.** Cloudflare codemode configures ToolDispatchers. Executor configures source registries. We compose Effect Layers. The chain IS the program. You can inspect it, transform it, serialize it.

3. **Attenuation as a type-level property.** Fork bomb prevention isn't a quota check. It's the absence of a type. When `Spawn` isn't in your capability set, you can't spawn. The compiler enforces it.

4. **Skill caching for free.** Effect programs are values. Hash them. Cache them. Two agents that generate the same program get the same cached isolate. Natural selection of microservices — good programs survive because they're reused.

5. **Observability for free.** Effect programs are traceable by construction. Every `yield*` is a span. Every error is typed. Every capability access is logged. The audit trail the research says nobody has — Effect gives it to you.

## Stack

- **Runtime:** Cloudflare Workers + Worker Loader binding
- **Language:** TypeScript + Effect
- **AI:** Workers AI (for experiment 04)
- **Storage:** KV (for experiments 02-05)
- **UI:** Inline HTML (no framework, no build step)
- **Deploy:** `wrangler deploy`

## Open Questions

- Can an Effect program generated by an LLM be reliably parsed and validated before execution? (The `acorn` approach from codemode, but for Effect.gen syntax)
- What's the serialization format for an Effect program that crosses an isolate boundary? (Effect has `Schema` — can we use it to serialize programs?)
- Can Worker Loader isolates communicate bidirectionally, or only request/response? (Relevant for streaming generated compute)
- What's the practical depth limit for recursive spawning before Loader overhead accumulates?
- Can we use Effect's `Schedule` to model long-running generated compute (the cron/webhook gap from research)?
