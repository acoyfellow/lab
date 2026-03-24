import { Effect, Exit, Cause } from "effect"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"
import UI from "./ui.html"

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

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(UI, { headers: { "content-type": "text/html" } })
    }

    const traceMatch = url.pathname.match(/^\/t\/([a-z0-9]+)(\.json)?$/i)
    if (req.method === "GET" && traceMatch) {
      const traceId = traceMatch[1]
      const wantsJson = traceMatch[2] === ".json"
      const trace = await getTrace(env, traceId)

      if (!trace) {
        if (wantsJson) {
          return Response.json({ error: "trace not found" }, { status: 404 })
        }
        return new Response(renderMissingTracePage(traceId), {
          status: 404,
          headers: { "content-type": "text/html" },
        })
      }

      if (wantsJson) {
        return Response.json(trace)
      }

      return new Response(renderTracePage(trace), {
        headers: { "content-type": "text/html" },
      })
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
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return respondWithTrace(
            env,
            {
              type: "sandbox",
              request: { code, capabilities: [] },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
            },
            { ok: false, error: failure.error, reason: failure.reason },
            failure.status
          )
        },
        onSuccess: async (result) =>
          respondWithTrace(
            env,
            {
              type: "sandbox",
              request: { code, capabilities: [] },
              outcome: { ok: true, result },
              timing: { totalMs },
            },
            { ok: true, result }
          ),
      })
    }

    // --- Run code with KV read capability (phase 2) ---
    if (req.method === "POST" && url.pathname === "/run/kv") {
      const { code } = (await req.json()) as { code: string }
      if (!code) return Response.json({ error: "no code" }, { status: 400 })

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
          return respondWithTrace(
            env,
            {
              type: "kv",
              request: { code, capabilities: ["kvRead"] },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
            },
            { ok: false, error: failure.error, reason: failure.reason },
            failure.status
          )
        },
        onSuccess: async (result) =>
          respondWithTrace(
            env,
            {
              type: "kv",
              request: { code, capabilities: ["kvRead"] },
              outcome: { ok: true, result },
              timing: { totalMs },
            },
            { ok: true, result }
          ),
      })
    }

    // --- Run capability chain (phase 3) ---
    if (req.method === "POST" && url.pathname === "/run/chain") {
      const body = (await req.json()) as {
        steps: Array<{ name?: string; code: string; capabilities: string[] }>
      }
      if (!body.steps || !Array.isArray(body.steps)) {
        return Response.json({ error: "no steps" }, { status: 400 })
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
          return respondWithTrace(
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
          )
        },
        onSuccess: async ({ result, trace }) =>
          respondWithTrace(
            env,
            {
              type: "chain",
              request: { steps: body.steps },
              outcome: { ok: true, result },
              timing: { totalMs },
              trace,
            },
            { ok: true, result, trace }
          ),
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
      return runToResponse(program.pipe(Effect.provide(layer)))
    }

    // --- Spawn recursive isolates (phase 5) ---
    if (req.method === "POST" && url.pathname === "/run/spawn") {
      const { code, capabilities, depth } = (await req.json()) as {
        code: string
        capabilities: string[]
        depth?: number
      }
      if (!code) return Response.json({ error: "no code" }, { status: 400 })
      const caps = capabilities ?? []
      if (!caps.includes("spawn")) {
        return Response.json({ error: "spawn capability required" }, { status: 400 })
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
          return respondWithTrace(
            env,
            {
              type: "spawn",
              request: { code, capabilities: caps, depth: spawnDepth },
              outcome: { ok: false, error: failure.error, reason: failure.reason },
              timing: { totalMs },
            },
            { ok: false, error: failure.error, reason: failure.reason },
            failure.status
          )
        },
        onSuccess: async (result) =>
          respondWithTrace(
            env,
            {
              type: "spawn",
              request: { code, capabilities: caps, depth: spawnDepth },
              outcome: { ok: true, result },
              timing: { totalMs },
            },
            { ok: true, result }
          ),
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
        return respondWithTrace(
          env,
          {
            type: "generate",
            request: { prompt, capabilities: caps },
            outcome: { ok: false, error: message },
            timing: { totalMs: Date.now() - t0, generateMs: Date.now() - t0, runMs: 0 },
          },
          { ok: false, error: message },
          500
        )
      }

      const generateMs = Date.now() - t0
      const raw = aiResult.response ?? ""

      // Normalize: strip markdown fences, unwrap IIFE
      const code = normalizeGenerated(raw)

      if (!code) {
        return respondWithTrace(
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
        )
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
          return respondWithTrace(
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
          )
        },
        onSuccess: async (result) =>
          respondWithTrace(
            env,
            {
              type: "generate",
              request: { prompt, capabilities: caps },
              outcome: { ok: true, result },
              timing: { totalMs: generateMs + runMs, generateMs, runMs },
              generated: code,
            },
            { ok: true, result, generated: code, generateMs, runMs }
          ),
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

function renderTracePage(trace: StoredTrace): string {
  const requestSections: string[] = []

  if (trace.request.prompt) {
    requestSections.push(renderTextSection("Prompt", trace.request.prompt))
  }
  if (trace.request.code) {
    requestSections.push(renderTextSection("Code", trace.request.code))
  }
  if (trace.request.capabilities) {
    requestSections.push(
      `<section><div class="label">Capabilities</div><div class="caps">${renderCapabilityBadges(trace.request.capabilities)}</div></section>`
    )
  }
  if (trace.request.depth !== undefined) {
    requestSections.push(
      renderTextSection("Depth", String(trace.request.depth))
    )
  }
  if (trace.request.steps?.length) {
    requestSections.push(renderStepDefinitions(trace.request.steps))
  }
  if (trace.generated) {
    requestSections.push(renderTextSection("Generated code", trace.generated))
  }

  const timingItems: string[] = []
  if (trace.timing?.totalMs !== undefined) timingItems.push(`total ${trace.timing.totalMs} ms`)
  if (trace.timing?.generateMs !== undefined) timingItems.push(`generate ${trace.timing.generateMs} ms`)
  if (trace.timing?.runMs !== undefined) timingItems.push(`run ${trace.timing.runMs} ms`)

  const outcomeBody = trace.outcome.ok
    ? renderValue(trace.outcome.result)
    : escapeHtml(
        trace.outcome.reason
          ? `${trace.outcome.error}\nreason: ${trace.outcome.reason}`
          : trace.outcome.error ?? "Unknown error"
      )

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>trace ${escapeHtml(trace.id)} · lab</title>
<style>
  :root {
    --bg: #fafafa; --surface: #fff; --surface-alt: #f5f5f5;
    --border: #e0e0e0; --text: #1a1a1a; --text-2: #666; --text-3: #999;
    --cap-on-bg: #e8f5e9; --cap-on-text: #2e7d32; --cap-on-border: #c8e6c9;
    --cap-off-bg: #fce4ec; --cap-off-text: #c62828; --cap-off-border: #f8bbd0;
    --mono: 'SF Mono', 'Menlo', 'Consolas', monospace;
    --sans: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: var(--sans); background: var(--bg); color: var(--text); line-height: 1.5; }
  .container { max-width: 860px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.02em; }
  .sub { color: var(--text-3); font-size: 0.8125rem; margin-top: 0.125rem; }
  .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; font-size: 0.8125rem; }
  .actions a, .actions button { color: var(--text-2); text-decoration: none; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 0.4rem 0.75rem; font: inherit; cursor: pointer; }
  .actions a:hover, .actions button:hover { color: var(--text); }
  section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 0.875rem; margin-top: 0.875rem; }
  .label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); margin-bottom: 0.5rem; }
  pre { background: var(--surface-alt); border-radius: 6px; padding: 0.75rem; font-family: var(--mono); font-size: 0.75rem; white-space: pre-wrap; overflow-x: auto; }
  .caps { display: flex; gap: 0.375rem; flex-wrap: wrap; }
  .cap { display: inline-flex; align-items: center; padding: 0.125rem 0.5rem; border-radius: 999px; font-size: 0.6875rem; font-weight: 500; border: 1px solid transparent; }
  .cap.on { background: var(--cap-on-bg); color: var(--cap-on-text); border-color: var(--cap-on-border); }
  .cap.off { background: var(--cap-off-bg); color: var(--cap-off-text); border-color: var(--cap-off-border); }
  .grid { display: grid; gap: 0.75rem; }
  .step { background: var(--surface-alt); border-radius: 6px; padding: 0.75rem; }
  .step-head { display: flex; justify-content: space-between; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; }
  .step-name { font-weight: 600; font-size: 0.8125rem; }
  .step-time { color: var(--text-3); font-family: var(--mono); font-size: 0.75rem; }
  .step-io { display: grid; gap: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 0.75rem; }
  .small { color: var(--text-2); font-size: 0.8125rem; }
  @media (max-width: 640px) {
    .step-io { grid-template-columns: 1fr; }
    header { flex-direction: column; }
  }
</style>
</head>
<body>
<div class="container">
  <header>
    <div>
      <h1>${escapeHtml(trace.type)} trace</h1>
      <div class="sub">id ${escapeHtml(trace.id)} · ${escapeHtml(trace.createdAt)}</div>
    </div>
    <div class="actions">
      <a href="/">Back</a>
      <a href="/t/${escapeHtml(trace.id)}.json">JSON</a>
      <button onclick="navigator.clipboard.writeText(location.href)">Copy URL</button>
    </div>
  </header>

  ${requestSections.join("")}

  <section>
    <div class="label">${trace.outcome.ok ? "Result" : "Error"}</div>
    <pre>${outcomeBody}</pre>
  </section>

  ${timingItems.length > 0 ? `<section><div class="label">Timing</div><div class="small">${escapeHtml(timingItems.join(" · "))}</div></section>` : ""}
  ${trace.trace?.length ? renderExecutionTrace(trace.trace) : ""}
</div>
</body>
</html>`
}

function renderMissingTracePage(traceId: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>trace not found · lab</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif; background: #fafafa; color: #1a1a1a; margin: 0; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 3rem 1.25rem; }
  a { color: #666; text-decoration: none; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>trace not found</h1>
    <p>no trace exists for id <code>${escapeHtml(traceId)}</code>.</p>
    <p><a href="/">back to lab</a></p>
  </div>
</body>
</html>`
}

function renderStepDefinitions(steps: Array<{ name?: string; code: string; capabilities: string[] }>): string {
  return `<section>
    <div class="label">Steps</div>
    <div class="grid">
      ${steps.map((step, idx) => `
        <div class="step">
          <div class="step-head">
            <div class="step-name">${escapeHtml(step.name ?? `Step ${idx + 1}`)}</div>
          </div>
          <div class="caps">${renderCapabilityBadges(step.capabilities)}</div>
          <div style="margin-top:0.75rem"><pre>${escapeHtml(step.code)}</pre></div>
        </div>
      `).join("")}
    </div>
  </section>`
}

function renderExecutionTrace(traceEntries: TraceEntry[]): string {
  return `<section>
    <div class="label">Execution trace</div>
    <div class="grid">
      ${traceEntries.map((entry) => `
        <div class="step">
          <div class="step-head">
            <div class="step-name">${escapeHtml(entry.name ?? `Step ${entry.step + 1}`)}</div>
            <div class="step-time">${entry.ms} ms</div>
          </div>
          <div class="caps">${renderCapabilityBadges(entry.capabilities)}</div>
          <div class="step-io">
            <div>
              <div class="label">Input</div>
              <pre>${renderValue(entry.input)}</pre>
            </div>
            <div>
              <div class="label">Output</div>
              <pre>${renderValue(entry.output)}</pre>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  </section>`
}

function renderTextSection(label: string, value: string): string {
  return `<section><div class="label">${escapeHtml(label)}</div><pre>${escapeHtml(value)}</pre></section>`
}

function renderCapabilityBadges(capabilities: string[]): string {
  if (capabilities.length === 0) {
    return `<span class="cap off">none</span>`
  }
  return capabilities
    .map((capability) => `<span class="cap on">${escapeHtml(capability)}</span>`)
    .join("")
}

function renderValue(value: unknown): string {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  return escapeHtml(JSON.stringify(value, null, 2))
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
