import { Effect, Exit, Cause } from "effect"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"

interface Env {
  LOADER: WorkerLoaderBinding
  KV: KVNamespace
  AI: Ai
  SELF: Fetcher
}

type RunType = "sandbox" | "kv" | "chain" | "generate" | "spawn"

type TraceEntry = {
  step: number
  name?: string
  capabilities: string[]
  input: unknown
  output: unknown
  ms: number
}

type TraceRequest = {
  code?: string
  prompt?: string
  capabilities?: string[]
  depth?: number
  steps?: Array<{ name?: string; code: string; capabilities: string[] }>
}

type TraceOutcome = {
  ok: boolean
  result?: unknown
  error?: string
  reason?: string
}

type StoredTrace = {
  id: string
  type: RunType
  createdAt: string
  request: TraceRequest
  outcome: TraceOutcome
  timing?: {
    totalMs?: number
    generateMs?: number
    runMs?: number
  }
  generated?: string
  trace?: TraceEntry[]
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    // CORS headers for SvelteKit dev
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    const withCors = (res: Response) => {
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v)
      }
      return res
    }

    // --- Trace retrieval (JSON only) ---
    const traceMatch = url.pathname.match(/^\/t\/([a-z0-9]+)$/i)
    if (req.method === "GET" && traceMatch) {
      const traceId = traceMatch[1]
      const trace = await getTrace(env, traceId)
      if (!trace) {
        return withCors(Response.json({ error: "trace not found" }, { status: 404 }))
      }
      return withCors(Response.json(trace))
    }

    // Shared KV read service builder
    const kvReadService = {
      get: (key: string) => Effect.promise(() => env.KV.get(key)),
      list: (prefix?: string) =>
        Effect.promise(async () => {
          const list = await env.KV.list({ prefix })
          return list.keys.map((k) => k.name)
        }),
    }

    const buildCaps = (capNames: string[], depth?: number) => {
      const caps: { kvRead?: typeof kvReadService; spawn?: { depth: number } } = {}
      if (capNames.includes("kvRead")) {
        caps.kvRead = kvReadService
      }
      if (capNames.includes("spawn") && depth !== undefined && depth > 0) {
        caps.spawn = { depth }
      }
      return caps
    }

    // --- Seed KV with demo data ---
    if (req.method === "POST" && url.pathname === "/seed") {
      await env.KV.put("user:1", JSON.stringify({ name: "Alice", role: "admin" }))
      await env.KV.put("user:2", JSON.stringify({ name: "Bob", role: "viewer" }))
      await env.KV.put("user:3", JSON.stringify({ name: "Carol", role: "editor" }))
      await env.KV.put("config:theme", "dark")
      return withCors(Response.json({ ok: true, seeded: 4 }))
    }

    // --- Run code (phase 1: no capabilities) ---
    if (req.method === "POST" && url.pathname === "/run") {
      const { code } = (await req.json()) as { code: string }
      if (!code) return withCors(Response.json({ error: "no code" }, { status: 400 }))

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code)
      })

      const layer = makeIsolateLive(env.LOADER)
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(await respondWithTrace(
            env,
            {
              type: "sandbox",
              request: { code, capabilities: [] },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
            },
            { ok: false, error: failure.error, reason: failure.reason },
            failure.status
          ))
        },
        onSuccess: async (result) =>
          withCors(await respondWithTrace(
            env,
            {
              type: "sandbox",
              request: { code, capabilities: [] },
              outcome: { ok: true, result },
              timing: { totalMs },
            },
            { ok: true, result }
          )),
      })
    }

    // --- Run code with KV read capability (phase 2) ---
    if (req.method === "POST" && url.pathname === "/run/kv") {
      const { code } = (await req.json()) as { code: string }
      if (!code) return withCors(Response.json({ error: "no code" }, { status: 400 }))

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, { kvRead: kvReadService })
      })

      const layer = makeIsolateLive(env.LOADER, env.KV)
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(await respondWithTrace(
            env,
            {
              type: "kv",
              request: { code, capabilities: ["kvRead"] },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
            },
            { ok: false, error: failure.error, reason: failure.reason },
            failure.status
          ))
        },
        onSuccess: async (result) =>
          withCors(await respondWithTrace(
            env,
            {
              type: "kv",
              request: { code, capabilities: ["kvRead"] },
              outcome: { ok: true, result },
              timing: { totalMs },
            },
            { ok: true, result }
          )),
      })
    }

    // --- Run capability chain (phase 3) ---
    if (req.method === "POST" && url.pathname === "/run/chain") {
      const body = (await req.json()) as {
        steps: Array<{ name?: string; code: string; capabilities: string[] }>
      }
      if (!body.steps || !Array.isArray(body.steps)) {
        return withCors(Response.json({ error: "no steps" }, { status: 400 }))
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
                name: step.name,
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
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(
        runChain.pipe(Effect.provide(layer))
      )
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(await respondWithTrace(
            env,
            {
              type: "chain",
              request: { steps: body.steps },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
              trace: [],
            },
            { ok: false, error: failure.error, reason: failure.reason, trace: [] },
            failure.status
          ))
        },
        onSuccess: async ({ result, trace }) =>
          withCors(await respondWithTrace(
            env,
            {
              type: "chain",
              request: { steps: body.steps },
              outcome: { ok: true, result },
              timing: { totalMs },
              trace,
            },
            { ok: true, result, trace }
          )),
      })
    }

    // --- Internal spawn child route (called by isolates via globalOutbound) ---
    if (req.method === "POST" && url.pathname === "/spawn/child") {
      const { code, capabilities, depth } = (await req.json()) as {
        code: string
        capabilities: string[]
        depth: number
      }
      const caps = capabilities ?? []
      const childCaps = buildCaps(caps, depth)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, childCaps)
      })

      const layer = makeIsolateLive(env.LOADER, env.KV, env.SELF)
      return withCors(await runToResponse(program.pipe(Effect.provide(layer))))
    }

    // --- Spawn recursive isolates (phase 5) ---
    if (req.method === "POST" && url.pathname === "/run/spawn") {
      const { code, capabilities, depth } = (await req.json()) as {
        code: string
        capabilities: string[]
        depth?: number
      }
      if (!code) return withCors(Response.json({ error: "no code" }, { status: 400 }))
      const caps = capabilities ?? []
      if (!caps.includes("spawn")) {
        return withCors(Response.json({ error: "spawn capability required" }, { status: 400 }))
      }
      const spawnDepth = depth ?? 2
      const extraCaps = buildCaps(caps.filter((cap) => cap !== "spawn"))

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.spawn(code, extraCaps, spawnDepth)
      })

      const layer = makeIsolateLive(env.LOADER, env.KV, env.SELF)
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(await respondWithTrace(
            env,
            {
              type: "spawn",
              request: { code, capabilities: caps, depth: spawnDepth },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
            },
            { ok: false, error: failure.error, reason: failure.reason },
            failure.status
          ))
        },
        onSuccess: async (result) =>
          withCors(await respondWithTrace(
            env,
            {
              type: "spawn",
              request: { code, capabilities: caps, depth: spawnDepth },
              outcome: { ok: true, result },
              timing: { totalMs },
            },
            { ok: true, result }
          )),
      })
    }

    // --- Generate and run code via LLM (phase 4) ---
    if (req.method === "POST" && url.pathname === "/run/generate") {
      const { prompt, capabilities } = (await req.json()) as {
        prompt: string
        capabilities: string[]
      }
      if (!prompt) return withCors(Response.json({ error: "no prompt" }, { status: 400 }))

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

      let aiResult: { response?: string }
      try {
        aiResult = await env.AI.run(
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
      } catch (error) {
        const message = getErrorMessage(error)
        return withCors(await respondWithTrace(
          env,
          {
            type: "generate",
            request: { prompt, capabilities: caps },
            outcome: { ok: false, error: message },
            timing: { totalMs: Date.now() - t0, generateMs: Date.now() - t0, runMs: 0 },
          },
          { ok: false, error: message },
          500
        ))
      }

      const generateMs = Date.now() - t0
      const raw = aiResult.response ?? ""

      // Normalize: strip markdown fences, unwrap IIFE
      const code = normalizeGenerated(raw)

      if (!code) {
        return withCors(await respondWithTrace(
          env,
          {
            type: "generate",
            request: { prompt, capabilities: caps },
            outcome: { ok: false, error: "LLM returned empty code" },
            timing: { totalMs: generateMs, generateMs, runMs: 0 },
            generated: raw,
          },
          { ok: false, error: "LLM returned empty code", raw, generated: raw, generateMs, runMs: 0 },
          500
        ))
      }

      const runCaps = hasKvRead ? { kvRead: kvReadService } : undefined

      // Run the generated code
      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, runCaps)
      })

      const layer = makeIsolateLive(env.LOADER, hasKvRead ? env.KV : undefined)
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const runMs = Date.now() - t0 - generateMs

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(await respondWithTrace(
            env,
            {
              type: "generate",
              request: { prompt, capabilities: caps },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs: generateMs + runMs, generateMs, runMs },
              generated: code,
            },
            {
              ok: false,
              reason: failure.reason,
              error: failure.error,
              generated: code,
              generateMs,
              runMs,
            },
            failure.status
          ))
        },
        onSuccess: async (result) =>
          withCors(await respondWithTrace(
            env,
            {
              type: "generate",
              request: { prompt, capabilities: caps },
              outcome: { ok: true, result },
              timing: { totalMs: generateMs + runMs, generateMs, runMs },
              generated: code,
            },
            { ok: true, result, generated: code, generateMs, runMs }
          )),
      })
    }

    return withCors(Response.json({ error: "not found" }, { status: 404 }))
  },
}

function normalizeGenerated(raw: string): string {
  // Strip markdown fences
  let code = raw
    .replace(/^```(?:javascript|js|typescript|ts)?\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim()

  // Unwrap async IIFE
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

async function respondWithTrace(
  env: Env,
  trace: Omit<StoredTrace, "id" | "createdAt">,
  body: Record<string, unknown>,
  status = 200
): Promise<Response> {
  const stored = await saveTrace(env, trace)
  return Response.json({ ...body, traceId: stored.id }, { status })
}

async function saveTrace(
  env: Env,
  trace: Omit<StoredTrace, "id" | "createdAt">
): Promise<StoredTrace> {
  const stored: StoredTrace = {
    ...trace,
    id: makeTraceId(),
    createdAt: new Date().toISOString(),
  }
  await env.KV.put(getTraceKey(stored.id), JSON.stringify(stored))
  return stored
}

async function getTrace(env: Env, traceId: string): Promise<StoredTrace | null> {
  const raw = await env.KV.get(getTraceKey(traceId))
  if (!raw) return null
  return JSON.parse(raw) as StoredTrace
}

function getTraceKey(traceId: string): string {
  return `trace:${traceId}`
}

function makeTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10)
}

function getFailureDetails(cause: Cause.Cause<IsolateError>) {
  const failure = Cause.failureOption(cause)
  if (failure._tag === "Some" && failure.value instanceof IsolateError) {
    return {
      status: 500,
      error: failure.value.message,
      reason: failure.value.reason,
    }
  }
  return {
    status: 500,
    error: Cause.pretty(cause),
    reason: undefined,
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
