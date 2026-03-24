import { Context, Effect, Data, Layer } from "effect"
import type { CapabilitySet } from "./Capability"

// --- Errors ---

export class IsolateError extends Data.TaggedError("IsolateError")<{
  readonly reason: "timeout" | "sandbox_violation" | "runtime" | "capability_denied"
  readonly message: string
}> {}

// --- Raw binding type (what Cloudflare gives us) ---

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

export class Isolate extends Context.Tag("@lab/Isolate")<
  Isolate,
  {
    readonly run: (code: string, capabilities?: CapabilitySet, input?: unknown) => Effect.Effect<unknown, IsolateError>
    readonly spawn: (code: string, capabilities?: CapabilitySet, depth?: number) => Effect.Effect<unknown, IsolateError>
  }
>() {}

// --- Wrapper code generation ---

const wrapCode = (
  code: string,
  caps?: CapabilitySet,
  kvSnapshot?: Record<string, string | null>,
  kvKeys?: string[],
  input?: unknown
): string => {
  const kvShim = caps?.kvRead
    ? `
    const __kvData = ${JSON.stringify(kvSnapshot ?? {})};
    const __kvKeys = ${JSON.stringify(kvKeys ?? [])};
    const kv = {
      async get(key) { return __kvData[key] ?? null; },
      async list(prefix) {
        if (!prefix) return __kvKeys;
        return __kvKeys.filter(k => k.startsWith(prefix));
      }
    };
`
    : `
    const kv = new Proxy({}, {
      get() { throw new Error("KvRead capability not granted"); }
    });
`

  const inputShim = input !== undefined
    ? `const input = ${JSON.stringify(input)};`
    : ``

  const spawnShim = caps?.spawn && caps.spawn.depth > 0
    ? `
    const spawn = async (code, caps) => {
      const res = await fetch("http://spawn/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, capabilities: caps || [] }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "spawn failed");
      return data.result;
    };
`
    : `
    const spawn = () => { throw new Error("Spawn capability not granted"); };
`

  return `
export default {
  async fetch(req, env) {
    try {
      ${inputShim}
      ${kvShim}
      ${spawnShim}
      const __result = await (async () => {
        ${code}
      })();
      return Response.json({ ok: true, result: __result ?? null });
    } catch (e) {
      return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
  }
};
`
}

// --- Named effectful helpers (Effect.fn for call-site tracing) ---

const hash = Effect.fn("hash")(function* (s: string) {
  const buf = yield* Effect.promise(() =>
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12)
})

const snapshotKv = Effect.fn("snapshotKv")(function* (kv: KVNamespace) {
  const list = yield* Effect.promise(() => kv.list())
  const keys = list.keys.map((k) => k.name)
  const entries = yield* Effect.promise(() =>
    Promise.all(keys.map(async (key) => [key, await kv.get(key)] as const))
  )
  return {
    snapshot: Object.fromEntries(entries) as Record<string, string | null>,
    keys,
  }
})

const parseIsolateResponse = Effect.fn("parseIsolateResponse")(
  function* (res: Response) {
    const body = yield* Effect.tryPromise({
      try: () => res.json() as Promise<Record<string, unknown>>,
      catch: () => new IsolateError({ reason: "runtime", message: "bad json" }),
    })

    if (body["ok"] === false) {
      const errMsg =
        typeof body["error"] === "string" ? body["error"] : "unknown"
      if (errMsg.includes("not permitted")) {
        return yield* new IsolateError({ reason: "sandbox_violation", message: errMsg })
      }
      if (errMsg.includes("capability not granted")) {
        return yield* new IsolateError({ reason: "capability_denied", message: errMsg })
      }
      return yield* new IsolateError({ reason: "runtime", message: errMsg })
    }

    return body["result"]
  }
)

// --- Outbound handler for spawn capability ---

const makeSpawnOutbound = (
  loader: WorkerLoaderBinding,
  kvNamespace: KVNamespace | undefined,
  parentDepth: number
): { fetch: (req: Request) => Promise<Response> } => {
  const handler = {
    fetch: async (req: Request): Promise<Response> => {
      try {
        const body = (await req.json()) as { code: string; capabilities: string[] }
        const childDepth = parentDepth - 1

        // Build child capabilities — can only request subset
        const childCaps: CapabilitySet = {
          ...(body.capabilities.includes("kvRead") && kvNamespace
            ? {
                kvRead: {
                  get: (key: string) => Effect.promise(() => kvNamespace.get(key)),
                  list: (prefix?: string) =>
                    Effect.promise(async () => {
                      const list = await kvNamespace.list({ prefix })
                      return list.keys.map((k) => k.name)
                    }),
                },
              }
            : {}),
          ...(childDepth > 0 && body.capabilities.includes("spawn")
            ? { spawn: { depth: childDepth } }
            : {}),
        }

        const childProgram = Effect.gen(function* () {
          const hasKv = !!childCaps.kvRead
          const hasSpawn = !!(childCaps.spawn && childCaps.spawn.depth > 0)
          const capKey = [hasKv ? ":kv" : "", hasSpawn ? `:spawn:${childDepth}` : ""].join("")
          const childId = yield* hash(body.code + capKey)

          const { snapshot: cs, keys: ck } = hasKv && kvNamespace
            ? yield* snapshotKv(kvNamespace)
            : { snapshot: {} as Record<string, string | null>, keys: [] as string[] }

          const childWrapped = wrapCode(body.code, childCaps, cs, ck)
          const childOutbound = hasSpawn
            ? makeSpawnOutbound(loader, kvNamespace, childDepth)
            : null

          const childWorker = loader.get(childId, async () => ({
            compatibilityDate: "2025-06-01",
            mainModule: "main.js",
            modules: { "main.js": childWrapped },
            globalOutbound: childOutbound,
          }))

          const childRes = yield* Effect.tryPromise({
            try: () => childWorker.getEntrypoint().fetch("http://x/"),
            catch: (e) =>
              new IsolateError({ reason: "runtime", message: e instanceof Error ? e.message : String(e) }),
          })

          return yield* parseIsolateResponse(childRes)
        })

        const result = await Effect.runPromise(childProgram)
        return Response.json({ ok: true, result })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return Response.json({ ok: false, error: msg }, { status: 500 })
      }
    },
  }
  return handler
}

// --- Execute an isolate with full config ---

const execIsolate = (
  loader: WorkerLoaderBinding,
  kvNamespace: KVNamespace | undefined
) =>
  Effect.fn("execIsolate")(function* (
    code: string,
    caps: CapabilitySet | undefined,
    input: unknown | undefined
  ) {
    const hasKv = !!(caps?.kvRead && kvNamespace)
    const hasSpawn = !!(caps?.spawn && caps.spawn.depth > 0)
    const spawnDepth = hasSpawn ? caps!.spawn!.depth : 0
    const capKey = [hasKv ? ":kv" : "", hasSpawn ? `:spawn:${spawnDepth}` : ""].join("")
    const inputKey = input !== undefined ? `:in:${JSON.stringify(input)}` : ""
    const id = yield* hash(code + capKey + inputKey)

    const { snapshot, keys } = hasKv
      ? yield* snapshotKv(kvNamespace!)
      : { snapshot: {} as Record<string, string | null>, keys: [] as string[] }

    const wrapped = wrapCode(code, caps, snapshot, keys, input)
    const globalOutbound = hasSpawn
      ? makeSpawnOutbound(loader, kvNamespace, spawnDepth)
      : null

    const worker = loader.get(id, async () => ({
      compatibilityDate: "2025-06-01",
      mainModule: "main.js",
      modules: { "main.js": wrapped },
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
  kvNamespace?: KVNamespace
) => {
  const exec = execIsolate(loader, kvNamespace)
  return Layer.succeed(
    Isolate,
    Isolate.of({
      run: Effect.fn("Isolate.run")(function* (
        code: string,
        caps?: CapabilitySet,
        input?: unknown
      ) {
        return yield* exec(code, caps, input)
      }),

      spawn: Effect.fn("Isolate.spawn")(function* (
        code: string,
        caps?: CapabilitySet,
        depth?: number
      ) {
        const spawnCaps: CapabilitySet = {
          ...caps,
          spawn: { depth: depth ?? 2 },
        }
        return yield* exec(code, spawnCaps, undefined)
      }),
    })
  )
}
