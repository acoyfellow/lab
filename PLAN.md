# loader-lab

Spawn sandboxed code on Cloudflare in milliseconds. Control what it can do with types.

## What this is

Cloudflare Worker Loaders let you create V8 isolates at runtime from a string of code. Effect lets you describe what a program needs before it runs. This project connects them.

You write an Effect program. It says what it needs — KV, AI, network, whatever. You hand it to a Loader. The Loader runs it in a fresh isolate with exactly those things. Nothing else.

If the program asks for something it wasn't given, it doesn't compile. Not a runtime error. A red squiggle in your editor.

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

An isolate that can read KV and an isolate that can read+write KV are different types. You can see the difference before anything runs.

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

Give an isolate `KvRead` and it can read. Give it `KvRead | KvWrite` and it can read and write. Try to give it `KvWrite` when you only have `KvRead` to offer — compiler says no.

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

Four isolates. Four different permission sets. Each step can only do what it says it can do. The whole chain is one program you can interrupt, retry, or time out.

## Phase 4: Generated Compute via Effect

Tell an LLM: "you have KV read, AI, and D1 write. Get user 123, summarize them, save it." It writes:

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

The LLM wrote code that uses three capabilities. It runs in an isolate that has those three capabilities. It can't use `fetch()`, it can't write to a different table, it can't spawn anything. It does what it said it would do.

Because Effect programs are values, you can hash them. Same program = same hash = cached isolate. Two agents that independently write the same solution reuse the same cached code.

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

Each child gets less than its parent. Less time, less memory, fewer capabilities. When budget hits zero, `Spawn` isn't in the capability set anymore. The child can't spawn. Recursion stops.

## Experiments

Each one runs in the browser. Paste code, hit run, see what happens.

### 01: Sandbox
Code goes in. Result comes out. No network. No storage. Just compute.

### 02: KV Reader
Same sandbox, but now it can read from KV. Still can't write. Still can't fetch.

### 03: Chain
Four isolates in sequence. First one parses. Second one validates. Third one enriches (can read KV). Fourth one writes (can write D1). Each one can only do its job.

### 04: AI Writes the Code
Describe what you want. AI writes an Effect program. The program runs with only the capabilities you specified. You can see exactly what it can do before it runs.

### 05: Spawner
An isolate that creates child isolates. Each child gets less budget. Watch the tree grow until it can't anymore.

## How it works

You define capabilities as types. You compose them into layers. You hand code to a Loader with a specific set of layers. The code runs with those layers and nothing else.

If you want to see what an isolate can do, read its type signature. If you want to change what it can do, change the layers you provide. If you want to chain isolates together, compose the programs. If you want to cache a program, hash it.

The interesting part isn't any one of these things. It's that they're all the same mechanism.

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
