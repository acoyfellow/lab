import { Data, Effect, Exit, Cause } from "effect"
import { Isolate, makeIsolateLive, type WorkerLoaderBinding } from "../Loader"
import type { CapabilitySet } from "../Capability"
import { resolveGuestTemplateId, type GuestTemplateId } from "../guest/templates"

// --- Types ---

export type DiagnosisCategory =
  | "syntax_error"
  | "runtime_error"
  | "capability_denied"
  | "timeout"
  | "logic_error"
  | "unknown"

export interface DiagnosisProblem {
  category: DiagnosisCategory
  stepIndex: number | null
  description: string
}

export interface Diagnosis {
  problem: DiagnosisProblem
  context: {
    errorMessage: string
    traceId: string
    code?: string
    input?: unknown
    capabilities?: string[]
  }
  hints: string[]
  confidence: "high" | "medium" | "low"
}

export type FixType = "code_change" | "capability_change" | "input_change" | "template_change"

export interface FixProposal {
  type: FixType
  description: string
  changes: {
    body?: string
    capabilities?: string[]
    template?: string
    input?: unknown
  }
  reasoning: string
  estimatedConfidence: "high" | "medium" | "low"
}

export interface VerificationResult {
  traceId: string
  ok: boolean
  result?: unknown
  error?: string
  diagnosis?: Diagnosis
}

export interface TraceDiff {
  input: {
    before: unknown
    after: unknown
    changed: boolean
  }
  code: {
    before: string | null
    after: string | null
    changed: boolean
  }
  output: {
    before: unknown
    after: unknown
    changed: boolean
  }
  error: {
    before: string | null
    after: string | null
    resolved: boolean
    introduced: boolean
  }
  steps?: {
    before: number
    after: number
  }
}

export interface Comparison {
  traceA: string
  traceB: string
  diff: TraceDiff
  summary: string
}

// --- Errors ---

export class HealingError extends Data.TaggedError("HealingError")<{
  readonly reason: "trace_not_found" | "llm_failed" | "execution_failed" | "invalid_input"
  readonly message: string
}> {}

// --- Trace Storage Types ---

type StepEntry = {
  step: number
  name?: string
  template?: string
  body?: string
  capabilities: string[]
  input: unknown
  output: unknown
  ms: number
}

type StoredResult = {
  id: string
  type: string
  createdAt: string
  request: {
    template?: string
    body?: string
    code?: string
    input?: unknown
    capabilities?: string[]
    steps?: Array<{
      name?: string
      template: string
      body: string
      capabilities: string[]
      props?: unknown
      input?: unknown
    }>
  }
  outcome: {
    ok: boolean
    result?: unknown
    error?: string
    reason?: string
  }
  timing?: {
    totalMs?: number
    generateMs?: number
    runMs?: number
  }
  generated?: string
  steps?: StepEntry[]
  diagnosis?: Diagnosis
  proposal?: FixProposal
}

// --- Helper functions ---

function getResultKey(resultId: string): string {
  return `result:${resultId}`
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

// --- LLM-based Diagnosis ---

const buildDiagnosisPrompt = (trace: StoredResult): string => {
  const error = trace.outcome.error || trace.outcome.reason || "Unknown error"
  const code = trace.request.body || trace.request.code || trace.generated || "N/A"
  const input = JSON.stringify(trace.request.input, null, 2)
  const capabilities = trace.request.capabilities?.join(", ") || "none"
  const steps = trace.steps
    ?.map((s, i) => `Step ${i}${s.name ? ` (${s.name})` : ""}: ${s.template} - ${s.body?.slice(0, 100)}...`)
    .join("\n")

  return `Analyze this failed code execution and provide a structured diagnosis.

Error: ${error}

Code:
\`\`\`javascript
${code}
\`\`\`

Input: ${input}

Capabilities: ${capabilities}

${steps ? `Steps:\n${steps}` : ""}

Provide a diagnosis in this JSON format:
{
  "problem": {
    "category": "syntax_error" | "runtime_error" | "capability_denied" | "timeout" | "logic_error" | "unknown",
    "stepIndex": number or null,
    "description": "detailed description of what went wrong"
  },
  "hints": ["hint1", "hint2"],
  "confidence": "high" | "medium" | "low"
}

Focus on:
1. The root cause of the failure
2. Which step failed (if chain)
3. Whether it's a code bug, missing capability, or input issue
4. Specific suggestions for fixing it`
}

const parseDiagnosisResponse = (response: string, traceId: string, trace: StoredResult): Diagnosis => {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        problem: {
          category: parsed.problem?.category || "unknown",
          stepIndex: parsed.problem?.stepIndex ?? null,
          description: parsed.problem?.description || "No description provided",
        },
        context: {
          errorMessage: trace.outcome.error || trace.outcome.reason || "Unknown",
          traceId,
          code: trace.request.body || trace.request.code || trace.generated,
          input: trace.request.input,
          capabilities: trace.request.capabilities,
        },
        hints: Array.isArray(parsed.hints) ? parsed.hints : [],
        confidence: parsed.confidence || "low",
      }
    }
  } catch {
    // Fall through to default diagnosis
  }

  // Fallback: create a basic diagnosis from the error
  const error = trace.outcome.error || ""
  let category: DiagnosisCategory = "unknown"
  if (error.includes("syntax") || error.includes("SyntaxError")) category = "syntax_error"
  else if (error.includes("capability") || error.includes("not granted")) category = "capability_denied"
  else if (error.includes("timeout")) category = "timeout"
  else if (trace.outcome.ok === false) category = "runtime_error"

  return {
    problem: {
      category,
      stepIndex: null,
      description: error || "Unknown error",
    },
    context: {
      errorMessage: error,
      traceId,
      code: trace.request.body || trace.request.code || trace.generated,
      input: trace.request.input,
      capabilities: trace.request.capabilities,
    },
    hints: ["Review the error message", "Check code syntax"],
    confidence: "low",
  }
}

// --- LLM-based Fix Proposal ---

const buildFixPrompt = (diagnosis: Diagnosis): string => {
  return `Given this diagnosis of a failed code execution, propose a fix.

Problem Category: ${diagnosis.problem.category}
Description: ${diagnosis.problem.description}
Step Index: ${diagnosis.problem.stepIndex ?? "N/A"}

Error Message: ${diagnosis.context.errorMessage}

${diagnosis.context.code ? `Current Code:
\`\`\`javascript
${diagnosis.context.code}
\`\`\`` : ""}

Input: ${JSON.stringify(diagnosis.context.input, null, 2)}

Current Capabilities: ${diagnosis.context.capabilities?.join(", ") || "none"}

Hints:
${diagnosis.hints.map((h) => `- ${h}`).join("\n")}

Provide a fix proposal in this JSON format:
{
  "type": "code_change" | "capability_change" | "input_change" | "template_change",
  "description": "what this fix does",
  "changes": {
    "body": "new code body (if code_change)",
    "capabilities": ["cap1", "cap2"],
    "template": "guest@v1 (if template_change)",
    "input": { ... }
  },
  "reasoning": "why this should work",
  "estimatedConfidence": "high" | "medium" | "low"
}

Only include changed fields in the changes object. The body should be complete runnable JavaScript code.`
}

const parseFixResponse = (response: string): FixProposal => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        type: parsed.type || "code_change",
        description: parsed.description || "No description",
        changes: {
          body: parsed.changes?.body,
          capabilities: parsed.changes?.capabilities,
          template: parsed.changes?.template,
          input: parsed.changes?.input,
        },
        reasoning: parsed.reasoning || "No reasoning provided",
        estimatedConfidence: parsed.estimatedConfidence || "low",
      }
    }
  } catch {
    // Fall through to default
  }

  return {
    type: "code_change",
    description: "Fallback fix based on error analysis",
    changes: {},
    reasoning: "Could not parse LLM response",
    estimatedConfidence: "low",
  }
}

// --- Core Functions ---

export function diagnoseTrace(
  traceId: string,
  kv: KVNamespace,
  ai: Ai,
): Effect.Effect<Diagnosis, HealingError> {
  return Effect.gen(function* () {
    const traceJson = yield* Effect.tryPromise({
      try: () => kv.get(getResultKey(traceId)),
      catch: (e) => new HealingError({ reason: "trace_not_found", message: getErrorMessage(e) }),
    })

    if (!traceJson) {
      return yield* Effect.fail(new HealingError({ reason: "trace_not_found", message: `Trace ${traceId} not found` }))
    }

    let trace: StoredResult
    try {
      trace = JSON.parse(traceJson) as StoredResult
    } catch (e) {
      return yield* Effect.fail(new HealingError({ reason: "invalid_input", message: `Invalid trace JSON: ${getErrorMessage(e)}` }))
    }

    if (trace.outcome.ok) {
      return yield* Effect.fail(new HealingError({ reason: "invalid_input", message: "Trace succeeded, nothing to diagnose" }))
    }

    const prompt = buildDiagnosisPrompt(trace)
    const aiResult = yield* Effect.tryPromise({
      try: () =>
        ai.run("@cf/meta/llama-3.1-8b-instruct" as Parameters<typeof ai.run>[0], {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
          temperature: 0.2,
        }) as Promise<{ response?: string }>,
      catch: (e) => new HealingError({ reason: "llm_failed", message: getErrorMessage(e) }),
    })

    const diagnosis = parseDiagnosisResponse(aiResult.response || "", traceId, trace)

    trace.diagnosis = diagnosis
    // Non-critical save - ignore errors
    yield* Effect.tryPromise({ try: () => kv.put(getResultKey(traceId), JSON.stringify(trace)), catch: () => new HealingError({ reason: "execution_failed", message: "save failed" }) }).pipe(Effect.ignore)

    return diagnosis
  })
}

export function proposeFix(
  diagnosis: Diagnosis,
  ai: Ai,
): Effect.Effect<FixProposal, HealingError> {
  return Effect.gen(function* () {
    const prompt = buildFixPrompt(diagnosis)
    const aiResult = yield* Effect.tryPromise({
      try: () =>
        ai.run("@cf/meta/llama-3.1-8b-instruct" as Parameters<typeof ai.run>[0], {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2048,
          temperature: 0.2,
        }) as Promise<{ response?: string }>,
      catch: (e) => new HealingError({ reason: "llm_failed", message: getErrorMessage(e) }),
    })

    const proposal = parseFixResponse(aiResult.response || "")
    return proposal
  })
}

export function verifyFix(
  proposal: FixProposal,
  baseTraceId: string | null,
  kv: KVNamespace,
  loader: WorkerLoaderBinding,
  selfFetcher: Fetcher,
  _ai: Ai,
): Effect.Effect<VerificationResult, HealingError> {
  return Effect.gen(function* () {
    let baseInput: unknown = proposal.changes.input
    let baseCapabilities: string[] = proposal.changes.capabilities || []
    let baseTemplate: GuestTemplateId = "guest@v1"
    let baseBody: string | null = proposal.changes.body || null

    if (baseTraceId) {
      const traceJson: string | null = yield* Effect.tryPromise({
        try: () => kv.get(getResultKey(baseTraceId)),
        catch: () => new HealingError({ reason: "trace_not_found", message: `Base trace ${baseTraceId} not found` }),
      }).pipe(Effect.catchTag("HealingError", () => Effect.succeed(null as string | null)))

      if (traceJson) {
        const baseTrace = JSON.parse(traceJson) as StoredResult
        baseInput = proposal.changes.input ?? baseTrace.request.input
        baseCapabilities = proposal.changes.capabilities ?? baseTrace.request.capabilities ?? []
        const resolvedTemplate = resolveGuestTemplateId(
          proposal.changes.template ?? baseTrace.request.template
        )
        if (resolvedTemplate) baseTemplate = resolvedTemplate
        baseBody = proposal.changes.body ?? baseTrace.request.body ?? baseTrace.generated ?? null
      }
    }

    if (!baseBody) {
      return yield* Effect.fail(new HealingError({ reason: "invalid_input", message: "No code body available for verification" }))
    }

    const caps: CapabilitySet = {}
    if (baseCapabilities.includes("kvRead")) {
      caps.kvRead = {
        get: (_key: string) => Effect.succeed(null),
        list: (_prefix?: string) => Effect.succeed([] as string[]),
      }
    }
    if (baseCapabilities.includes("workersAi")) caps.workersAi = true
    if (baseCapabilities.includes("r2Read")) caps.r2Read = true
    if (baseCapabilities.includes("d1Read")) caps.d1Read = true
    if (baseCapabilities.includes("durableObjectFetch")) caps.durableObjectFetch = true
    if (baseCapabilities.includes("containerHttp")) caps.containerHttp = true
    if (baseCapabilities.includes("petri")) caps.petri = true

    const layer = makeIsolateLive(loader, kv, selfFetcher)
    const t0 = Date.now()

    const program = Effect.gen(function* () {
      const isolate = yield* Isolate
      return yield* isolate.run(baseBody!, caps, baseInput, baseTemplate)
    })

    const exit = yield* Effect.exit(Effect.provide(program, layer))

    return yield* Exit.match(exit, {
      onFailure: (cause) => {
        let errorMsg = "Execution failed"
        const pretty = Cause.pretty(cause)
        for (const line of pretty.split("\n")) {
          if (line.includes("IsolateError")) {
            errorMsg = line
            break
          }
        }

        const resultId = crypto.randomUUID().replace(/-/g, "").slice(0, 10)
        const failedResult: StoredResult = {
          id: resultId,
          type: "healing_verify",
          createdAt: new Date().toISOString(),
          request: {
            body: baseBody!,
            input: baseInput,
            capabilities: baseCapabilities,
            template: baseTemplate,
          },
          outcome: { ok: false, error: errorMsg },
          timing: { totalMs: Date.now() - t0 },
          proposal,
        }

        try { void kv.put(getResultKey(resultId), JSON.stringify(failedResult)) } catch {}
        return Effect.succeed({ traceId: resultId, ok: false, error: errorMsg } as VerificationResult)
      },
      onSuccess: (runResult) => {
        const resultId = crypto.randomUUID().replace(/-/g, "").slice(0, 10)
        const successResult: StoredResult = {
          id: resultId,
          type: "healing_verify",
          createdAt: new Date().toISOString(),
          request: {
            body: baseBody!,
            input: baseInput,
            capabilities: baseCapabilities,
            template: baseTemplate,
          },
          outcome: { ok: true, result: runResult },
          timing: { totalMs: Date.now() - t0 },
          proposal,
        }

        try { void kv.put(getResultKey(resultId), JSON.stringify(successResult)) } catch {}
        return Effect.succeed({ traceId: resultId, ok: true, result: runResult } as VerificationResult)
      },
    })
  })
}

export function compareTraces(
  traceAId: string,
  traceBId: string,
  kv: KVNamespace,
): Effect.Effect<Comparison, HealingError> {
  return Effect.gen(function* () {
    // Fetch both traces
    const [traceAJson, traceBJson] = yield* Effect.all([
      Effect.tryPromise({
        try: () => kv.get(getResultKey(traceAId)),
        catch: (e) => new HealingError({ reason: "trace_not_found", message: `Trace A: ${getErrorMessage(e)}` }),
      }),
      Effect.tryPromise({
        try: () => kv.get(getResultKey(traceBId)),
        catch: (e) => new HealingError({ reason: "trace_not_found", message: `Trace B: ${getErrorMessage(e)}` }),
      }),
    ])

    if (!traceAJson) {
      return yield* Effect.fail(new HealingError({ reason: "trace_not_found", message: `Trace ${traceAId} not found` }))
    }
    if (!traceBJson) {
      return yield* Effect.fail(new HealingError({ reason: "trace_not_found", message: `Trace ${traceBId} not found` }))
    }

    let traceA: StoredResult
    let traceB: StoredResult
    try {
      traceA = JSON.parse(traceAJson) as StoredResult
      traceB = JSON.parse(traceBJson) as StoredResult
    } catch (e) {
      return yield* Effect.fail(new HealingError({ reason: "invalid_input", message: `Invalid trace JSON: ${getErrorMessage(e)}` }))
    }

    // Compute diff
    const codeA = traceA.request.body || traceA.generated || ""
    const codeB = traceB.request.body || traceB.generated || ""

    const diff: TraceDiff = {
      input: {
        before: traceA.request.input,
        after: traceB.request.input,
        changed: JSON.stringify(traceA.request.input) !== JSON.stringify(traceB.request.input),
      },
      code: {
        before: codeA || null,
        after: codeB || null,
        changed: codeA !== codeB,
      },
      output: {
        before: traceA.outcome.result,
        after: traceB.outcome.result,
        changed: JSON.stringify(traceA.outcome.result) !== JSON.stringify(traceB.outcome.result),
      },
      error: {
        before: traceA.outcome.error || null,
        after: traceB.outcome.error || null,
        resolved: !!traceA.outcome.error && !traceB.outcome.error,
        introduced: !traceA.outcome.error && !!traceB.outcome.error,
      },
      steps: traceA.steps || traceB.steps ? {
        before: traceA.steps?.length || 0,
        after: traceB.steps?.length || 0,
      } : undefined,
    }

    // Generate summary
    const summaries: string[] = []
    if (diff.error.resolved) summaries.push("Error was resolved")
    if (diff.error.introduced) summaries.push("New error introduced")
    if (diff.code.changed) summaries.push("Code was modified")
    if (diff.input.changed) summaries.push("Input was changed")
    if (diff.output.changed && !diff.error.introduced) summaries.push("Output changed")
    if (summaries.length === 0) summaries.push("No significant differences")

    return {
      traceA: traceAId,
      traceB: traceBId,
      diff,
      summary: summaries.join("; "),
    }
  })
}

// --- HTTP Route Handlers ---

export async function handleDiagnose(
  req: Request,
  env: { KV: KVNamespace; AI: any },
): Promise<Response> {
  const body = (await req.json()) as { traceId?: string }

  if (typeof body.traceId !== "string" || !body.traceId) {
    return Response.json({ ok: false, error: "traceId required" }, { status: 400 })
  }

  const effect = diagnoseTrace(body.traceId, env.KV, env.AI)
  const exit = await Effect.runPromiseExit(effect)

  return Exit.match(exit, {
    onFailure: (cause) => {
      let error = "Unknown error"
      for (const reason of Cause.pretty(cause).split("\n")) {
        if (reason.includes("HealingError")) {
          const match = reason.match(/message: "([^"]+)"/)
          if (match) error = match[1]
        }
      }
      return Response.json({ ok: false, error }, { status: 500 })
    },
    onSuccess: (diagnosis) => Response.json({ ok: true, diagnosis }),
  })
}

export async function handlePropose(
  req: Request,
  env: { AI: any },
): Promise<Response> {
  const body = (await req.json()) as { diagnosis?: Diagnosis }

  if (!body.diagnosis || typeof body.diagnosis !== "object") {
    return Response.json({ ok: false, error: "diagnosis object required" }, { status: 400 })
  }

  const effect = proposeFix(body.diagnosis, env.AI)
  const exit = await Effect.runPromiseExit(effect)

  return Exit.match(exit, {
    onFailure: (cause) => {
      let error = "Unknown error"
      for (const reason of Cause.pretty(cause).split("\n")) {
        if (reason.includes("HealingError")) {
          const match = reason.match(/message: "([^"]+)"/)
          if (match) error = match[1]
        }
      }
      return Response.json({ ok: false, error }, { status: 500 })
    },
    onSuccess: (proposal) => Response.json({ ok: true, proposal }),
  })
}

export async function handleVerify(
  req: Request,
  env: {
    KV: KVNamespace
    LOADER: WorkerLoaderBinding
    SELF: Fetcher
    AI: any
  },
): Promise<Response> {
  const body = (await req.json()) as {
    proposal?: FixProposal
    baseTraceId?: string | null
  }

  if (!body.proposal || typeof body.proposal !== "object") {
    return Response.json({ ok: false, error: "proposal object required" }, { status: 400 })
  }

  const effect = verifyFix(body.proposal, body.baseTraceId ?? null, env.KV, env.LOADER, env.SELF, env.AI)
  const exit = await Effect.runPromiseExit(effect)

  return Exit.match(exit, {
    onFailure: (cause) => {
      let error = "Unknown error"
      for (const reason of Cause.pretty(cause).split("\n")) {
        if (reason.includes("HealingError")) {
          const match = reason.match(/message: "([^"]+)"/)
          if (match) error = match[1]
        }
      }
      return Response.json({ ok: false, error }, { status: 500 })
    },
    // Return the full VerificationResult unchanged so the SDK contract
    // (`{ ok, result: VerificationResult }`) is preserved. Flattening here
    // drops `result.ok` and conflates a falsy `result.result` (0, false, "",
    // null) with a failed run.
    onSuccess: (result) => Response.json({ ok: true, result }),
  })
}

export async function handleCompare(
  req: Request,
  env: { KV: KVNamespace },
): Promise<Response> {
  const body = (await req.json()) as { a?: string; b?: string }

  if (typeof body.a !== "string" || !body.a) {
    return Response.json({ ok: false, error: "a (traceId) required" }, { status: 400 })
  }
  if (typeof body.b !== "string" || !body.b) {
    return Response.json({ ok: false, error: "b (traceId) required" }, { status: 400 })
  }

  const effect = compareTraces(body.a, body.b, env.KV)
  const exit = await Effect.runPromiseExit(effect)

  return Exit.match(exit, {
    onFailure: (cause) => {
      let error = "Unknown error"
      for (const reason of Cause.pretty(cause).split("\n")) {
        if (reason.includes("HealingError")) {
          const match = reason.match(/message: "([^"]+)"/)
          if (match) error = match[1]
        }
      }
      return Response.json({ ok: false, error }, { status: 500 })
    },
    onSuccess: (comparison) => Response.json({ ok: true, comparison }),
  })
}
