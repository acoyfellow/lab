import { Data, Effect, Layer, ServiceMap } from "effect"
import type { CapabilitySet } from "./Capability"
import {
  composeGuestModule,
  GUEST_TEMPLATE_DEFAULT,
  type GuestTemplateId,
} from "./guest/templates"
import { guestBodySyntaxError } from "./guest/validate"

// --- Errors ---

export class IsolateError extends Data.TaggedError("IsolateError")<{
  readonly reason: "timeout" | "sandbox_violation" | "runtime" | "capability_denied"
  readonly message: string
}> {}

// --- Custom binding factory for capabilities ---

export type CustomBindingFactory = (caps: CapabilitySet | undefined, input: unknown | undefined) => Record<string, unknown> | undefined

// --- Raw binding type (what Cloudflare gives you) ---

export interface WorkerLoaderBinding {
  get(
    id: string,
    cb: () => Promise<{
      compatibilityDate: string
      mainModule: string
      modules: Record<string, string>
      env?: Record<string, unknown>
      globalOutbound?: null | { fetch: (req: Request) => Promise<Response> }
    }>
  ): {
    getEntrypoint(name?: string): {
      fetch(req: Request | string): Promise<Response>
    }
  }
}

// --- Isolate Service ---

export class Isolate extends ServiceMap.Service<
  Isolate,
  {
    readonly run: (
      body: string,
      capabilities?: CapabilitySet,
      input?: unknown,
      templateId?: GuestTemplateId
    ) => Effect.Effect<unknown, IsolateError>
    readonly spawn: (
      body: string,
      capabilities?: CapabilitySet,
      depth?: number,
      templateId?: GuestTemplateId
    ) => Effect.Effect<unknown, IsolateError>
  }
>()("@lab/Isolate") {}

function isolateUsesSelfOutbound(caps?: CapabilitySet): boolean {
  if (!caps) return false
  if (caps.spawn && caps.spawn.depth > 0) return true
  if (caps.workersAi) return true
  if (caps.r2Read) return true
  if (caps.d1Read) return true
  if (caps.durableObjectFetch) return true
  if (caps.containerHttp) return true
  if (caps.petri) return true
  return false
}

// --- Named effectful helpers (Effect.fn for call-site tracing) ---

const hash = Effect.fn("hash")(function* (s: string) {
  const buf = yield* Effect.promise((_signal) =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12)
})

const snapshotKv = Effect.fn("snapshotKv")(function* (kv: KVNamespace) {
  const list = yield* Effect.promise((_signal) => kv.list())
  const keys = list.keys.map((k) => k.name)
  const entries = yield* Effect.promise((_signal) =>
    Promise.all(keys.map(async (key) => [key, await kv.get(key)] as const))
  )
  return {
    snapshot: Object.fromEntries(entries) as Record<string, string | null>,
    keys,
  }
})

const parseIsolateResponse = Effect.fn("parseIsolateResponse")(function* (res: Response) {
  const body = yield* Effect.tryPromise({
    try: () => res.json() as Promise<Record<string, unknown>>,
    catch: () => new IsolateError({ reason: "runtime", message: "bad json" }),
  })

  if (body["ok"] === false) {
    const errMsg = typeof body["error"] === "string" ? body["error"] : "unknown"
    if (errMsg.includes("not permitted")) {
      return yield* new IsolateError({ reason: "sandbox_violation", message: errMsg })
    }
    if (errMsg.includes("capability not granted")) {
      return yield* new IsolateError({ reason: "capability_denied", message: errMsg })
    }
    return yield* new IsolateError({ reason: "runtime", message: errMsg })
  }

  return body["result"]
})

// --- Execute an isolate with full config ---

const execIsolate = (loader: WorkerLoaderBinding, kvNamespace: KVNamespace | undefined, selfFetcher?: Fetcher, customBindings?: CustomBindingFactory) =>
  Effect.fn("execIsolate")(function* (
    body: string,
    caps: CapabilitySet | undefined,
    input: unknown | undefined,
    templateId: GuestTemplateId = GUEST_TEMPLATE_DEFAULT
  ) {
    const hasKv = !!(caps?.kvRead && kvNamespace)
    const hasSpawn = !!(caps?.spawn && caps.spawn.depth > 0)
    const spawnDepth = hasSpawn ? caps!.spawn!.depth : 0
    const capKey = [
      hasKv ? ":kv" : "",
      hasSpawn ? `:spawn:${spawnDepth}` : "",
      caps?.workersAi ? ":ai" : "",
      caps?.r2Read ? ":r2" : "",
      caps?.d1Read ? ":d1" : "",
      caps?.durableObjectFetch ? ":do" : "",
      caps?.containerHttp ? ":ctr" : "",
      caps?.petri ? ":petri" : "",
    ].join("")
    const inputKey = input !== undefined ? `:in:${JSON.stringify(input)}` : ""
    const id = yield* hash(templateId + ":" + body + capKey + inputKey)

    const { snapshot, keys } = hasKv
      ? yield* snapshotKv(kvNamespace!)
      : { snapshot: {} as Record<string, string | null>, keys: [] as string[] }

    const syntaxErr = guestBodySyntaxError(body)
    if (syntaxErr) {
      return yield* new IsolateError({
        reason: "runtime",
        message: `guest body syntax: ${syntaxErr}`,
      })
    }

    const wrapped = composeGuestModule(templateId, body, caps, snapshot, keys, input)

    const useOutbound = isolateUsesSelfOutbound(caps)
    const globalOutbound = useOutbound && selfFetcher ? selfFetcher : null

    // Get custom env bindings (e.g., PETRI RPC stub)
    const customEnv = customBindings ? customBindings(caps, input) : undefined

    const worker = loader.get(id, async () => ({
      compatibilityDate: "2025-06-01",
      mainModule: "main.js",
      modules: { "main.js": wrapped },
      env: customEnv,
      globalOutbound,
    }))

    const res = yield* Effect.tryPromise({
      try: () => worker.getEntrypoint().fetch("http://x/"),
      catch: (e) =>
        new IsolateError({ reason: "runtime", message: e instanceof Error ? e.message : String(e) }),
    })

    return yield* parseIsolateResponse(res)
  })

// --- Live Layer ---

export const makeIsolateLive = (
  loader: WorkerLoaderBinding,
  kvNamespace?: KVNamespace,
  selfFetcher?: Fetcher,
  customBindings?: CustomBindingFactory
) => {
  const exec = execIsolate(loader, kvNamespace, selfFetcher, customBindings)
  return Layer.succeed(Isolate)({
    run: Effect.fn("Isolate.run")(function* (
      body: string,
      caps?: CapabilitySet,
      input?: unknown,
      templateId?: GuestTemplateId
    ) {
      return yield* exec(body, caps, input, templateId ?? GUEST_TEMPLATE_DEFAULT)
    }),

    spawn: Effect.fn("Isolate.spawn")(function* (
      body: string,
      caps?: CapabilitySet,
      depth?: number,
      templateId?: GuestTemplateId
    ) {
      const spawnCaps: CapabilitySet = {
        ...caps,
        spawn: { depth: depth ?? 2 },
      }
      return yield* exec(body, spawnCaps, undefined, templateId ?? GUEST_TEMPLATE_DEFAULT)
    }),
  })
}
