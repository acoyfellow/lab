import { Effect, Exit, Cause } from "effect"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"
import UI from "./ui.html"

interface Env {
  LOADER: WorkerLoaderBinding
  KV: KVNamespace
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(UI, { headers: { "content-type": "text/html" } })
    }

    // --- Seed KV with demo data ---
    if (req.method === "POST" && url.pathname === "/seed") {
      await env.KV.put("user:1", JSON.stringify({ name: "Alice", role: "admin" }))
      await env.KV.put("user:2", JSON.stringify({ name: "Bob", role: "viewer" }))
      await env.KV.put("user:3", JSON.stringify({ name: "Carol", role: "editor" }))
      await env.KV.put("config:theme", "dark")
      return Response.json({ ok: true, seeded: 4 })
    }

    // --- Run code (phase 1: no capabilities) ---
    if (req.method === "POST" && url.pathname === "/run") {
      const { code } = (await req.json()) as { code: string }
      if (!code) return Response.json({ error: "no code" }, { status: 400 })

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code)
      })

      const layer = makeIsolateLive(env.LOADER)
      return runToResponse(program.pipe(Effect.provide(layer)))
    }

    // --- Run code with KV read capability (phase 2) ---
    if (req.method === "POST" && url.pathname === "/run/kv") {
      const { code } = (await req.json()) as { code: string }
      if (!code) return Response.json({ error: "no code" }, { status: 400 })

      const kvRead = {
        get: (key: string) =>
          Effect.promise(() => env.KV.get(key)),
        list: (prefix?: string) =>
          Effect.promise(async () => {
            const list = await env.KV.list({ prefix })
            return list.keys.map((k) => k.name)
          }),
      }

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, { kvRead })
      })

      const layer = makeIsolateLive(env.LOADER, env.KV)
      return runToResponse(program.pipe(Effect.provide(layer)))
    }

    // --- Run capability chain (phase 3) ---
    if (req.method === "POST" && url.pathname === "/run/chain") {
      const body = (await req.json()) as {
        steps: Array<{ code: string; capabilities: string[] }>
      }
      if (!body.steps || !Array.isArray(body.steps)) {
        return Response.json({ error: "no steps" }, { status: 400 })
      }

      const kvRead = {
        get: (key: string) => Effect.promise(() => env.KV.get(key)),
        list: (prefix?: string) =>
          Effect.promise(async () => {
            const list = await env.KV.list({ prefix })
            return list.keys.map((k) => k.name)
          }),
      }

      type TraceEntry = {
        step: number
        capabilities: string[]
        input: unknown
        output: unknown
        ms: number
      }

      const buildCaps = (capNames: string[]) => {
        const caps: { kvRead?: typeof kvRead } = {}
        if (capNames.includes("kvRead")) {
          caps.kvRead = kvRead
        }
        return caps
      }

      const runChain = Effect.gen(function* () {
        const isolate = yield* Isolate
        const trace: TraceEntry[] = []

        const finalResult = yield* Effect.reduce(
          body.steps,
          undefined as unknown,
          (stepInput, step, i) =>
            Effect.gen(function* () {
              const t0 = Date.now()
              const caps = buildCaps(step.capabilities)
              const output = yield* isolate.run(step.code, caps, stepInput)
              const ms = Date.now() - t0
              trace.push({
                step: i,
                capabilities: step.capabilities,
                input: stepInput,
                output,
                ms,
              })
              return output
            })
        )

        return { result: finalResult, trace }
      })

      const layer = makeIsolateLive(env.LOADER, env.KV)
      const exit = await Effect.runPromiseExit(
        runChain.pipe(Effect.provide(layer))
      )

      return Exit.match(exit, {
        onFailure: (cause) => {
          const failure = Cause.failureOption(cause)
          if (failure._tag === "Some" && failure.value instanceof IsolateError) {
            return Response.json(
              {
                ok: false,
                reason: failure.value.reason,
                error: failure.value.message,
              },
              { status: 500 }
            )
          }
          return Response.json(
            { ok: false, error: Cause.pretty(cause) },
            { status: 500 }
          )
        },
        onSuccess: ({ result, trace }) =>
          Response.json({ ok: true, result, trace }),
      })
    }

    return Response.json({ error: "not found" }, { status: 404 })
  },
}

async function runToResponse(
  effect: Effect.Effect<unknown, IsolateError>
): Promise<Response> {
  const exit = await Effect.runPromiseExit(effect)
  return Exit.match(exit, {
    onFailure: (cause) => {
      const failure = Cause.failureOption(cause)
      if (failure._tag === "Some" && failure.value instanceof IsolateError) {
        return Response.json(
          { ok: false, reason: failure.value.reason, error: failure.value.message },
          { status: 500 }
        )
      }
      return Response.json(
        { ok: false, error: Cause.pretty(cause) },
        { status: 500 }
      )
    },
    onSuccess: (result) => Response.json({ ok: true, result }),
  })
}
