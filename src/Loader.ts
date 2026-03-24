import { Context, Effect, Data, Layer } from "effect"

// --- Errors ---

export class IsolateError extends Data.TaggedError("IsolateError")<{
  readonly reason: "timeout" | "sandbox_violation" | "runtime"
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
      globalOutbound?: null
    }>
  ): {
    getEntrypoint(name?: string): {
      fetch(req: Request | string): Promise<Response>
    }
  }
}

// --- Isolate Service ---

export class Isolate extends Context.Tag("Isolate")<
  Isolate,
  {
    readonly run: (code: string) => Effect.Effect<unknown, IsolateError>
  }
>() {}

// --- Live implementation backed by a LOADER binding ---

export const makeIsolateLive = (loader: WorkerLoaderBinding) =>
  Layer.succeed(
    Isolate,
    Isolate.of({
      run: (code: string) =>
        Effect.gen(function* () {
          const id = yield* hash(code)

          const wrapped = `
export default {
  async fetch(req, env) {
    try {
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
          const worker = loader.get(id, async () => ({
            compatibilityDate: "2025-06-01",
            mainModule: "main.js",
            modules: { "main.js": wrapped },
            globalOutbound: null,
          }))

          const res = yield* Effect.tryPromise({
            try: () => worker.getEntrypoint().fetch("http://x/"),
            catch: (e) =>
              new IsolateError({
                reason: "runtime",
                message: e instanceof Error ? e.message : String(e),
              }),
          })

          const body = yield* Effect.tryPromise({
            try: () => res.json() as Promise<Record<string, unknown>>,
            catch: () =>
              new IsolateError({ reason: "runtime", message: "bad json" }),
          })

          if (body["ok"] === false) {
            const errMsg = typeof body["error"] === "string" ? body["error"] : "unknown"
            if (errMsg.includes("not permitted")) {
              return yield* new IsolateError({ reason: "sandbox_violation", message: errMsg })
            }
            return yield* new IsolateError({ reason: "runtime", message: errMsg })
          }

          return body["result"]
        }),
    })
  )

// --- Helpers ---

const hash = (s: string) =>
  Effect.promise(async () => {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(s)
    )
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 12)
  })
