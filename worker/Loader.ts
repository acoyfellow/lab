import { Context, Effect, Data, Layer } from "effect"
import type { CapabilitySet } from "./Capability"
import { denyMessageFor } from "./capabilities/registry"

// --- Errors ---

export class IsolateError extends Data.TaggedError("IsolateError")<{
  readonly reason: "timeout" | "sandbox_violation" | "runtime" | "capability_denied"
  readonly message: string
}> {}

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

export class Isolate extends Context.Tag("@lab/Isolate")<
  Isolate,
  {
    readonly run: (code: string, capabilities?: CapabilitySet, input?: unknown) => Effect.Effect<unknown, IsolateError>
    readonly spawn: (code: string, capabilities?: CapabilitySet, depth?: number) => Effect.Effect<unknown, IsolateError>
  }
>() {}

function isolateUsesSelfOutbound(caps?: CapabilitySet): boolean {
  if (!caps) return false
  if (caps.spawn && caps.spawn.depth > 0) return true
  if (caps.workersAi) return true
  if (caps.r2Read) return true
  if (caps.d1Read) return true
  if (caps.durableObjectFetch) return true
  if (caps.containerHttp) return true
  return false
}

// --- Wrapper code generation ---

const wrapCode = (
  code: string,
  caps?: CapabilitySet,
  kvSnapshot?: Record<string, string | null>,
  kvKeys?: string[],
  input?: unknown
): string => {
  const kvDeny = denyMessageFor("kvRead")
  const spawnDeny = denyMessageFor("spawn")
  const aiDeny = denyMessageFor("workersAi")
  const r2Deny = denyMessageFor("r2Read")
  const d1Deny = denyMessageFor("d1Read")
  const doDeny = denyMessageFor("durableObjectFetch")
  const contDeny = denyMessageFor("containerHttp")

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
      get() { throw new Error(${JSON.stringify(kvDeny)}); }
    });
`

  const inputShim = input !== undefined
    ? `const input = ${JSON.stringify(input)};`
    : ``

  const spawnDepth = caps?.spawn?.depth ?? 0
  const spawnShim = caps?.spawn && spawnDepth > 0
    ? `
    const spawn = async (code, caps) => {
      const res = await fetch("http://internal/spawn/child", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, capabilities: caps || [], depth: ${spawnDepth - 1} }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "spawn failed");
      return data.result;
    };
`
    : `
    const spawn = () => { throw new Error(${JSON.stringify(spawnDeny)}); };
`

  const aiShim = caps?.workersAi
    ? `
    const ai = {
      async run(prompt) {
        const res = await fetch("http://internal/invoke/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke ai failed");
        return data.result;
      }
    };
`
    : `
    const ai = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(aiDeny)}); }
    });
`

  const r2Shim = caps?.r2Read
    ? `
    const r2 = {
      async list(prefix, limit) {
        const res = await fetch("http://internal/invoke/r2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "list", prefix: prefix ?? null, limit: limit ?? 500 }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke r2 failed");
        return data.result;
      },
      async getText(key, maxBytes) {
        const res = await fetch("http://internal/invoke/r2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "getText", key, maxBytes: maxBytes ?? 262144 }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke r2 failed");
        return data.result;
      }
    };
`
    : `
    const r2 = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(r2Deny)}); }
    });
`

  const d1Shim = caps?.d1Read
    ? `
    const d1 = {
      async query(sql) {
        const res = await fetch("http://internal/invoke/d1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sql }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke d1 failed");
        return data.result;
      }
    };
`
    : `
    const d1 = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(d1Deny)}); }
    });
`

  const doShim = caps?.durableObjectFetch
    ? `
    const labDo = {
      async fetch(name, path) {
        const res = await fetch("http://internal/invoke/do", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, path: path ?? "/" }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke do failed");
        return data.result;
      }
    };
`
    : `
    const labDo = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(doDeny)}); }
    });
`

  const contShim = caps?.containerHttp
    ? `
    const labContainer = {
      async get(path) {
        const res = await fetch("http://internal/invoke/container", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: path ?? "/" }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "invoke container failed");
        return data.result;
      }
    };
`
    : `
    const labContainer = new Proxy({}, {
      get() { throw new Error(${JSON.stringify(contDeny)}); }
    });
`

  return `
export default {
  async fetch(req, env) {
    try {
      ${inputShim}
      ${kvShim}
      ${spawnShim}
      ${aiShim}
      ${r2Shim}
      ${d1Shim}
      ${doShim}
      ${contShim}
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

// --- Execute an isolate with full config ---

const execIsolate = (
  loader: WorkerLoaderBinding,
  kvNamespace: KVNamespace | undefined,
  selfFetcher?: Fetcher
) =>
  Effect.fn("execIsolate")(function* (
    code: string,
    caps: CapabilitySet | undefined,
    input: unknown | undefined
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
    ].join("")
    const inputKey = input !== undefined ? `:in:${JSON.stringify(input)}` : ""
    const id = yield* hash(code + capKey + inputKey)

    const { snapshot, keys } = hasKv
      ? yield* snapshotKv(kvNamespace!)
      : { snapshot: {} as Record<string, string | null>, keys: [] as string[] }

    const wrapped = wrapCode(code, caps, snapshot, keys, input)

    const useOutbound = isolateUsesSelfOutbound(caps)
    const globalOutbound = useOutbound && selfFetcher ? selfFetcher : null

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
  kvNamespace?: KVNamespace,
  selfFetcher?: Fetcher
) => {
  const exec = execIsolate(loader, kvNamespace, selfFetcher)
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
