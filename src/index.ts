import { Effect, Exit, Cause } from "effect"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"
import UI from "./ui.html"

interface Env {
  LOADER: WorkerLoaderBinding
  KV: KVNamespace
  AI: Ai
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

    // --- Generate and run code via LLM (phase 4) ---
    if (req.method === "POST" && url.pathname === "/run/generate") {
      const { prompt, capabilities } = (await req.json()) as {
        prompt: string
        capabilities: string[]
      }
      if (!prompt) return Response.json({ error: "no prompt" }, { status: 400 })

      const caps = capabilities ?? []
      const hasKvRead = caps.includes("kvRead")

      const systemPrompt = [
        "You are a code generator. You write JavaScript async function bodies.",
        "The user describes what they want. You return ONLY the code — no markdown, no explanation.",
        "The code will run inside an async IIFE in a sandboxed V8 isolate.",
        "Return the final value with `return`.",
        hasKvRead
          ? "Available: `kv.get(key)` returns string|null, `kv.list(prefix?)` returns string[]. Both are async."
          : "No external APIs available. Pure compute only.",
        "Do NOT use import/export. Do NOT use fetch. Do NOT use console.log.",
        "Do NOT wrap in an async function or IIFE. The code already runs inside an async context.",
        "Use `return` at the TOP LEVEL to return the final value. Example: `const x = await kv.list(); return x;`",
        "Do NOT use .then() chains. Use await instead.",
      ].join("\n")

      const t0 = Date.now()

      const aiResult = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct" as Parameters<typeof env.AI.run>[0],
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
          temperature: 0.2,
        }
      ) as { response?: string }

      const generateMs = Date.now() - t0
      const raw = aiResult.response ?? ""

      // Normalize: strip markdown fences, unwrap IIFE
      const code = normalizeGenerated(raw)

      if (!code) {
        return Response.json(
          { ok: false, error: "LLM returned empty code", raw },
          { status: 500 }
        )
      }

      // Build capabilities
      const kvRead = hasKvRead
        ? {
            get: (key: string) => Effect.promise(() => env.KV.get(key)),
            list: (prefix?: string) =>
              Effect.promise(async () => {
                const list = await env.KV.list({ prefix })
                return list.keys.map((k) => k.name)
              }),
          }
        : undefined

      const runCaps = hasKvRead ? { kvRead } : undefined

      // Run the generated code
      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, runCaps)
      })

      const layer = makeIsolateLive(env.LOADER, hasKvRead ? env.KV : undefined)
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const runMs = Date.now() - t0 - generateMs

      return Exit.match(exit, {
        onFailure: (cause) => {
          const failure = Cause.failureOption(cause)
          if (failure._tag === "Some" && failure.value instanceof IsolateError) {
            return Response.json(
              {
                ok: false,
                reason: failure.value.reason,
                error: failure.value.message,
                generated: code,
                generateMs,
                runMs,
              },
              { status: 500 }
            )
          }
          return Response.json(
            { ok: false, error: Cause.pretty(cause), generated: code, generateMs, runMs },
            { status: 500 }
          )
        },
        onSuccess: (result) =>
          Response.json({ ok: true, result, generated: code, generateMs, runMs }),
      })
    }

    return Response.json({ error: "not found" }, { status: 404 })
  },
}

function normalizeGenerated(raw: string): string {
  // Strip markdown fences
  let code = raw
    .replace(/^```(?:javascript|js|typescript|ts)?\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim()

  // Unwrap async IIFE: (async () => { ... })() or (async function() { ... })()
  // The wrapper already provides an async IIFE context
  const iifeMatch = code.match(
    /^\(?async\s+(?:(?:function\s*\(\))|(?:\(\)\s*=>))\s*\{([\s\S]*)\}\)?\(\);?$/
  )
  if (iifeMatch) {
    code = iifeMatch[1].trim()
  }

  // If no top-level return, try to add one to the last expression
  if (!/^\s*return\s/m.test(code)) {
    const lines = code.split("\n")
    const last = lines[lines.length - 1].trim()
    // If last line looks like an expression (not a declaration, block, etc)
    if (last && !last.startsWith("//") && !last.startsWith("const ") &&
        !last.startsWith("let ") && !last.startsWith("var ") &&
        !last.startsWith("}") && !last.startsWith("if ") &&
        !last.startsWith("for ") && !last.startsWith("while ")) {
      lines[lines.length - 1] = "return " + lines[lines.length - 1]
      code = lines.join("\n")
    }
  }

  return code
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
