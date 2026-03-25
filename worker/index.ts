export { LabStubDurableObject } from "./durable-object-stub"

import { Effect, Exit, Cause } from "effect"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"
import type { CapabilitySet } from "./Capability"

const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct" as const

interface Env {
  LOADER: WorkerLoaderBinding
  KV: KVNamespace
  AI: Ai
  SELF: Fetcher
  R2?: R2Bucket
  ENGINE_D1?: D1Database
  LAB_DO?: DurableObjectNamespace
  /** Optional Cloudflare Container / fetcher binding */
  LAB_CONTAINER?: Fetcher
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

const defaultExport = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

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

    const kvReadService = {
      get: (key: string) => Effect.promise(() => env.KV.get(key)),
      list: (prefix?: string) =>
        Effect.promise(async () => {
          const list = await env.KV.list({ prefix })
          return list.keys.map((k) => k.name)
        }),
    }

    function buildCapabilitySet(capNames: string[], depth: number | undefined): CapabilitySet {
      const caps: CapabilitySet = {}
      if (capNames.includes("kvRead")) {
        caps.kvRead = kvReadService
      }
      if (capNames.includes("spawn") && depth !== undefined && depth > 0) {
        caps.spawn = { depth }
      }
      if (capNames.includes("workersAi")) caps.workersAi = true
      if (capNames.includes("r2Read")) caps.r2Read = true
      if (capNames.includes("d1Read")) caps.d1Read = true
      if (capNames.includes("durableObjectFetch")) caps.durableObjectFetch = true
      if (capNames.includes("containerHttp")) caps.containerHttp = true
      return caps
    }

    const isolateLayer = () => makeIsolateLive(env.LOADER, env.KV, env.SELF)

    // --- Internal invoke routes (guest isolates via SELF outbound) ---
    if (req.method === "POST" && url.pathname === "/invoke/ai") {
      const body = (await req.json()) as { prompt?: string }
      if (typeof body.prompt !== "string" || body.prompt.length > 8000) {
        return withCors(Response.json({ ok: false, error: "invalid prompt" }, { status: 400 }))
      }
      try {
        const aiResult = (await env.AI.run(AI_MODEL as Parameters<typeof env.AI.run>[0], {
          messages: [{ role: "user", content: body.prompt.slice(0, 8000) }],
          max_tokens: 256,
          temperature: 0.2,
        })) as { response?: string }
        const text = aiResult.response ?? ""
        return withCors(Response.json({ ok: true, result: text }))
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
    }

    if (req.method === "POST" && url.pathname === "/invoke/r2") {
      if (!env.R2) {
        return withCors(Response.json({ ok: false, error: "R2 binding not configured" }, { status: 503 }))
      }
      const body = (await req.json()) as {
        action?: string
        prefix?: string | null
        limit?: number
        key?: string
        maxBytes?: number
      }
      try {
        if (body.action === "list") {
          const listed = await env.R2.list({
            prefix: body.prefix ?? undefined,
            limit: Math.min(body.limit ?? 500, 1000),
          })
          const keys = listed.objects.map((o) => o.key)
          return withCors(Response.json({ ok: true, result: keys }))
        }
        if (body.action === "getText") {
          if (typeof body.key !== "string" || !body.key) {
            return withCors(Response.json({ ok: false, error: "key required" }, { status: 400 }))
          }
          const maxB = Math.min(body.maxBytes ?? 262144, 1024 * 1024)
          const obj = await env.R2.get(body.key)
          if (!obj) {
            return withCors(Response.json({ ok: true, result: null }))
          }
          const text = await obj.text()
          if (text.length > maxB) {
            return withCors(
              Response.json({ ok: false, error: `object larger than maxBytes ${maxB}` }, { status: 400 }),
            )
          }
          return withCors(Response.json({ ok: true, result: text }))
        }
        return withCors(Response.json({ ok: false, error: "unknown r2 action" }, { status: 400 }))
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
    }

    if (req.method === "POST" && url.pathname === "/invoke/d1") {
      if (!env.ENGINE_D1) {
        return withCors(Response.json({ ok: false, error: "ENGINE_D1 binding not configured" }, { status: 503 }))
      }
      const body = (await req.json()) as { sql?: string }
      if (typeof body.sql !== "string" || !body.sql.trim()) {
        return withCors(Response.json({ ok: false, error: "sql required" }, { status: 400 }))
      }
      if (!isReadOnlyD1Sql(body.sql)) {
        return withCors(Response.json({ ok: false, error: "only read-only SELECT queries allowed" }, { status: 400 }))
      }
      try {
        const stmt = await env.ENGINE_D1.prepare(body.sql)
        const r = await stmt.all()
        return withCors(Response.json({ ok: true, result: r }))
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
    }

    if (req.method === "POST" && url.pathname === "/invoke/do") {
      if (!env.LAB_DO) {
        return withCors(Response.json({ ok: false, error: "LAB_DO binding not configured" }, { status: 503 }))
      }
      const body = (await req.json()) as { name?: string; path?: string }
      if (typeof body.name !== "string" || !body.name) {
        return withCors(Response.json({ ok: false, error: "name required" }, { status: 400 }))
      }
      const path = typeof body.path === "string" ? body.path : "/"
      try {
        const id = env.LAB_DO.idFromName(body.name)
        const stub = env.LAB_DO.get(id)
        const r = await stub.fetch(`https://internal${path.startsWith("/") ? path : `/${path}`}`)
        const j = (await r.json()) as Record<string, unknown>
        return withCors(Response.json({ ok: true, result: j }))
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
    }

    if (req.method === "POST" && url.pathname === "/invoke/container") {
      if (!env.LAB_CONTAINER) {
        return withCors(
          Response.json({ ok: false, error: "LAB_CONTAINER binding not configured" }, { status: 503 }),
        )
      }
      const body = (await req.json()) as { path?: string }
      const p = typeof body.path === "string" ? body.path : "/"
      try {
        const target = `http://container${p.startsWith("/") ? p : `/${p}`}`
        const r = await env.LAB_CONTAINER.fetch(new Request(target, { method: "GET" }))
        const text = await r.text()
        return withCors(
          Response.json({
            ok: true,
            result: { status: r.status, body: text.slice(0, 65536) },
          }),
        )
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
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

    // --- Seed KV with demo data ---
    if (req.method === "POST" && url.pathname === "/seed") {
      await env.KV.put("user:1", JSON.stringify({ name: "Alice", role: "admin" }))
      await env.KV.put("user:2", JSON.stringify({ name: "Bob", role: "viewer" }))
      await env.KV.put("user:3", JSON.stringify({ name: "Carol", role: "editor" }))
      await env.KV.put("config:theme", "dark")
      return withCors(Response.json({ ok: true, seeded: 4 }))
    }

    // --- Run code (optional capabilities) ---
    if (req.method === "POST" && url.pathname === "/run") {
      const { code, capabilities: capList } = (await req.json()) as {
        code: string
        capabilities?: string[]
      }
      if (!code) return withCors(Response.json({ error: "no code" }, { status: 400 }))
      const capNames = capList ?? []
      const runCaps = buildCapabilitySet(capNames, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, runCaps)
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithTrace(
              env,
              {
                type: "sandbox",
                request: { code, capabilities: capNames },
                outcome: { ok: false, error: failure.error, reason: failure.reason },
                timing: { totalMs },
              },
              { ok: false, error: failure.error, reason: failure.reason },
              failure.status,
            ),
          )
        },
        onSuccess: async (result) =>
          withCors(
            await respondWithTrace(
              env,
              {
                type: "sandbox",
                request: { code, capabilities: capNames },
                outcome: { ok: true, result },
                timing: { totalMs },
              },
              { ok: true, result },
            ),
          ),
      })
    }

    // --- Run code with KV read capability ---
    if (req.method === "POST" && url.pathname === "/run/kv") {
      const { code, capabilities: extra } = (await req.json()) as {
        code: string
        capabilities?: string[]
      }
      if (!code) return withCors(Response.json({ error: "no code" }, { status: 400 }))

      const capNames = [...new Set(["kvRead", ...(extra ?? [])])]
      const runCaps = buildCapabilitySet(capNames, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, runCaps)
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithTrace(
              env,
              {
                type: "kv",
                request: { code, capabilities: capNames },
                outcome: { ok: false, error: failure.error, reason: failure.reason },
                timing: { totalMs },
              },
              { ok: false, error: failure.error, reason: failure.reason },
              failure.status,
            ),
          )
        },
        onSuccess: async (result) =>
          withCors(
            await respondWithTrace(
              env,
              {
                type: "kv",
                request: { code, capabilities: capNames },
                outcome: { ok: true, result },
                timing: { totalMs },
              },
              { ok: true, result },
            ),
          ),
      })
    }

    // --- Run capability chain ---
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
              const caps = buildCapabilitySet(step.capabilities, undefined)
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
            }),
        )

        return { result: finalResult, trace }
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(runChain.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithTrace(
              env,
              {
                type: "chain",
                request: { steps: body.steps },
                outcome: { ok: false, error: failure.error, reason: failure.reason },
                timing: { totalMs },
                trace: [],
              },
              { ok: false, error: failure.error, reason: failure.reason, trace: [] },
              failure.status,
            ),
          )
        },
        onSuccess: async ({ result, trace }) =>
          withCors(
            await respondWithTrace(
              env,
              {
                type: "chain",
                request: { steps: body.steps },
                outcome: { ok: true, result },
                timing: { totalMs },
                trace,
              },
              { ok: true, result, trace },
            ),
          ),
      })
    }

    // --- Internal spawn child route ---
    if (req.method === "POST" && url.pathname === "/spawn/child") {
      const { code, capabilities, depth } = (await req.json()) as {
        code: string
        capabilities: string[]
        depth: number
      }
      const caps = capabilities ?? []
      const childCaps = buildCapabilitySet(caps, depth)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code, childCaps)
      })

      const layer = isolateLayer()
      return withCors(await runToResponse(program.pipe(Effect.provide(layer))))
    }

    // --- Spawn recursive isolates ---
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
      const other = caps.filter((cap) => cap !== "spawn")
      const extraCaps = buildCapabilitySet(other, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.spawn(code, extraCaps, spawnDepth)
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithTrace(
              env,
              {
                type: "spawn",
                request: { code, capabilities: caps, depth: spawnDepth },
                outcome: { ok: false, error: failure.error, reason: failure.reason },
                timing: { totalMs },
              },
              { ok: false, error: failure.error, reason: failure.reason },
              failure.status,
            ),
          )
        },
        onSuccess: async (result) =>
          withCors(
            await respondWithTrace(
              env,
              {
                type: "spawn",
                request: { code, capabilities: caps, depth: spawnDepth },
                outcome: { ok: true, result },
                timing: { totalMs },
              },
              { ok: true, result },
            ),
          ),
      })
    }

    // --- Generate and run code via LLM ---
    if (req.method === "POST" && url.pathname === "/run/generate") {
      const { prompt, capabilities } = (await req.json()) as {
        prompt: string
        capabilities: string[]
      }
      if (!prompt) return withCors(Response.json({ error: "no prompt" }, { status: 400 }))

      const caps = capabilities ?? []
      const hasKvRead = caps.includes("kvRead")

      const apiLines: string[] = []
      if (hasKvRead) {
        apiLines.push(
          "`kv.get(key)` / `kv.list(prefix?)` — async, snapshot KV.",
        )
      }
      if (caps.includes("workersAi")) {
        apiLines.push("`ai.run(prompt)` — async, returns model text via host Workers AI.")
      }
      if (caps.includes("r2Read")) {
        apiLines.push("`r2.list(prefix?, limit?)` / `r2.getText(key, maxBytes?)` — async R2 reads.")
      }
      if (caps.includes("d1Read")) {
        apiLines.push("`d1.query(sql)` — async, read-only SELECT against engine D1.")
      }
      if (caps.includes("durableObjectFetch")) {
        apiLines.push("`labDo.fetch(name, path)` — async stub Durable Object JSON.")
      }
      if (caps.includes("containerHttp")) {
        apiLines.push("`labContainer.get(path)` — async HTTP GET to bound container (if configured).")
      }

      const systemPrompt = [
        "You are a code generator. You write JavaScript async function bodies.",
        "The user describes what they want. You return ONLY the code — no markdown, no explanation.",
        "The code will run inside an async IIFE in a sandboxed V8 isolate.",
        "Return the final value with `return`.",
        apiLines.length > 0
          ? "Available APIs:\n" + apiLines.join("\n")
          : "No external APIs available. Pure compute only.",
        "Do NOT use import/export. Do NOT use fetch. Do NOT use console.log.",
        "Do NOT wrap in an async function or IIFE. The code already runs inside an async context.",
        "Use `return` at the TOP LEVEL to return the final value. Example: `const x = await kv.list(); return x;`",
        "Do NOT use .then() chains. Use await instead.",
      ].join("\n")

      const t0 = Date.now()

      let aiResult: { response?: string }
      try {
        aiResult = (await env.AI.run(AI_MODEL as Parameters<typeof env.AI.run>[0], {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 512,
          temperature: 0.2,
        })) as { response?: string }
      } catch (error) {
        const message = getErrorMessage(error)
        return withCors(
          await respondWithTrace(
            env,
            {
              type: "generate",
              request: { prompt, capabilities: caps },
              outcome: { ok: false, error: message },
              timing: { totalMs: Date.now() - t0, generateMs: Date.now() - t0, runMs: 0 },
            },
            { ok: false, error: message },
            500,
          ),
        )
      }

      const generateMs = Date.now() - t0
      const raw = aiResult.response ?? ""

      const genCode = normalizeGenerated(raw)

      if (!genCode) {
        return withCors(
          await respondWithTrace(
            env,
            {
              type: "generate",
              request: { prompt, capabilities: caps },
              outcome: { ok: false, error: "LLM returned empty code" },
              timing: { totalMs: generateMs, generateMs, runMs: 0 },
              generated: raw,
            },
            { ok: false, error: "LLM returned empty code", raw, generated: raw, generateMs, runMs: 0 },
            500,
          ),
        )
      }

      const runCaps = buildCapabilitySet(caps, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(genCode, runCaps)
      })

      const layer = isolateLayer()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const runMs = Date.now() - t0 - generateMs

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithTrace(
              env,
              {
                type: "generate",
                request: { prompt, capabilities: caps },
                outcome: { ok: false, error: failure.error, reason: failure.reason },
                timing: { totalMs: generateMs + runMs, generateMs, runMs },
                generated: genCode,
              },
              {
                ok: false,
                reason: failure.reason,
                error: failure.error,
                generated: genCode,
                generateMs,
                runMs,
              },
              failure.status,
            ),
          )
        },
        onSuccess: async (result) =>
          withCors(
            await respondWithTrace(
              env,
              {
                type: "generate",
                request: { prompt, capabilities: caps },
                outcome: { ok: true, result },
                timing: { totalMs: generateMs + runMs, generateMs, runMs },
                generated: genCode,
              },
              { ok: true, result, generated: genCode, generateMs, runMs },
            ),
          ),
      })
    }

    return withCors(Response.json({ error: "not found" }, { status: 404 }))
  },
}

export default defaultExport

function isReadOnlyD1Sql(sql: string): boolean {
  const s = sql.trim()
  const low = s.toLowerCase()
  if (!low.startsWith("select") && !low.startsWith("with")) return false
  return !/\b(insert|update|delete|drop|alter|pragma|attach|detach)\b/i.test(s)
}

function normalizeGenerated(raw: string): string {
  let code = raw
    .replace(/^```(?:javascript|js|typescript|ts)?\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim()

  const iifeMatch = code.match(
    /^\(?async\s+(?:(?:function\s*\(\))|(?:\(\)\s*=>))\s*\{([\s\S]*)\}\)?\(\);?$/,
  )
  if (iifeMatch) {
    code = iifeMatch[1].trim()
  }

  if (!/^\s*return\s/m.test(code)) {
    const lines = code.split("\n")
    const last = lines[lines.length - 1].trim()
    if (
      last &&
      !last.startsWith("//") &&
      !last.startsWith("const ") &&
      !last.startsWith("let ") &&
      !last.startsWith("var ") &&
      !last.startsWith("}") &&
      !last.startsWith("if ") &&
      !last.startsWith("for ") &&
      !last.startsWith("while ")
    ) {
      lines[lines.length - 1] = "return " + lines[lines.length - 1]
      code = lines.join("\n")
    }
  }

  return code
}

async function runToResponse(
  effect: Effect.Effect<unknown, IsolateError>,
): Promise<Response> {
  const exit = await Effect.runPromiseExit(effect)
  return Exit.match(exit, {
    onFailure: (cause) => {
      const failure = Cause.failureOption(cause)
      if (failure._tag === "Some" && failure.value instanceof IsolateError) {
        return Response.json(
          { ok: false, reason: failure.value.reason, error: failure.value.message },
          { status: 500 },
        )
      }
      return Response.json({ ok: false, error: Cause.pretty(cause) }, { status: 500 })
    },
    onSuccess: (result) => Response.json({ ok: true, result }),
  })
}

async function respondWithTrace(
  env: Env,
  trace: Omit<StoredTrace, "id" | "createdAt">,
  body: Record<string, unknown>,
  status = 200,
): Promise<Response> {
  const stored = await saveTrace(env, trace)
  return Response.json({ ...body, traceId: stored.id }, { status })
}

async function saveTrace(
  env: Env,
  trace: Omit<StoredTrace, "id" | "createdAt">,
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
