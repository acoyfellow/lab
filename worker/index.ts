export { LabStubDurableObject } from "./durable-object-stub"
export { PetriDish } from "@acoyfellow/lab-petri/durable-object"
export { PetriBinding } from "./petri-binding"

import { WorkerEntrypoint } from "cloudflare:workers"
import { Effect, Exit, Cause } from "effect"
import { authGate } from "./auth"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"
import type { CapabilitySet } from "./Capability"
import { CAPABILITY_REGISTRY, type LabCapabilityId } from "./capabilities/registry"
import { buildLabCatalog } from "./catalog"
import { resolveGuestTemplateId, type GuestTemplateId } from "./guest/templates"
import {
  handleCreateStory,
  handleGetStory,
  handleForkStory,
  handleAppendToStory,
  handleUpdateStoryStatus,
  handleListStories,
  type CreateStoryRequest,
  type ForkStoryRequest,
  type AppendToStoryRequest,
  type StoryStatus,
} from "./routes/stories"
import { handleDiagnose, handlePropose, handleVerify, handleCompare } from "./routes/healing"
import {
  appendReceiptToSession,
  getSession,
  handleCreateSession,
  listSessions,
  updateSessionSummary,
  type ArtifactRef,
} from "./routes/sessions"

const AI_MODEL_DEFAULT = "@cf/meta/llama-3.1-8b-instruct" as const

interface Env {
  LOADER: WorkerLoaderBinding
  KV: KVNamespace
  AI: Ai
  SELF: Fetcher
  R2?: R2Bucket
  ENGINE_D1?: D1Database
  LAB_DO?: DurableObjectNamespace
  PETRI_DO?: DurableObjectNamespace
  /** Optional Cloudflare Container / fetcher binding */
  LAB_CONTAINER?: Fetcher
  /**
   * Optional. Comma-separated list of bearer tokens. When set, every external
   * request must carry `Authorization: Bearer <token>` with a matching value.
   * When unset/empty, the worker is open (public-instance mode).
   */
  LAB_AUTH_TOKEN?: string
  /**
   * Optional. CORS allowed origin to use when LAB_AUTH_TOKEN is set. Defaults to
   * empty (no Access-Control-Allow-Origin header). Set to "*" or a specific origin
   * to allow browser clients. Cookies are not used; auth is via Authorization header.
   */
  LAB_CORS_ORIGIN?: string
}

type RunType = "sandbox" | "kv" | "chain" | "generate" | "spawn" | "external"

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

type ChainStepStored = {
  name?: string
  template: string
  body: string
  capabilities: string[]
  props?: unknown
  input?: unknown
}

type ResultRequest = {
  template?: string
  body?: string
  /** @deprecated legacy guest field; use body */
  code?: string
  prompt?: string
  mode?: "code" | "json"
  input?: unknown
  capabilities?: string[]
  depth?: number
  steps?: ChainStepStored[]
  source?: string
  action?: string
  actor?: unknown
  output?: unknown
  replay?: unknown
  evidence?: unknown
  metadata?: unknown
  parentId?: string
  supersedes?: string
  sessionId?: string
  artifact?: ArtifactRef
}

function parseGuestRunPayload(p: {
  body?: unknown
  code?: unknown
  template?: unknown
}): { body: string; template: GuestTemplateId } | null {
  const resolved = resolveGuestTemplateId(
    typeof p.template === "string" && p.template.trim() ? p.template.trim() : undefined,
  )
  if (!resolved) return null
  const raw = p.body !== undefined ? p.body : p.code
  if (typeof raw !== "string" || !raw.trim()) return null
  return { body: raw, template: resolved }
}

type NormalizedChainStep = {
  name?: string
  body: string
  template: GuestTemplateId
  capabilities: string[]
  props?: unknown
  input?: unknown
}

function normalizeChainSteps(steps: unknown): NormalizedChainStep[] | null {
  if (!Array.isArray(steps)) return null
  const out: NormalizedChainStep[] = []
  for (const item of steps) {
    if (!item || typeof item !== "object") return null
    const o = item as Record<string, unknown>
    const caps = Array.isArray(o.capabilities) ? [...(o.capabilities as string[])] : []
    const parsed = parseGuestRunPayload({ body: o.body, code: o.code, template: o.template })
    if (!parsed) return null
    out.push({
      name: typeof o.name === "string" ? o.name : undefined,
      body: parsed.body,
      template: parsed.template,
      capabilities: caps,
      props: o.props,
      input: o.input,
    })
  }
  return out
}

function chainStepsForResult(steps: NormalizedChainStep[]): ChainStepStored[] {
  return steps.map((s) => ({
    name: s.name,
    template: s.template,
    body: s.body,
    capabilities: s.capabilities,
    ...(s.props !== undefined ? { props: s.props } : {}),
    ...(s.input !== undefined ? { input: s.input } : {}),
  }))
}

type ResultOutcome = {
  ok: boolean
  result?: unknown
  error?: string
  reason?: string
}

type StoredResult = {
  id: string
  type: RunType
  createdAt: string
  request: ResultRequest
  outcome: ResultOutcome
  timing?: {
    totalMs?: number
    generateMs?: number
    runMs?: number
  }
  generated?: string
  steps?: StepEntry[]
  receipt?: ExternalReceiptStored
  lineage?: {
    parentId?: string
    supersedes?: string
  }
  sessionId?: string
  artifact?: ArtifactRef
}

type ReplayMode = "inspect-only" | "rerun-sandbox" | "rerun-live-requires-approval" | "continue-from-here"

type ExternalReceiptStored = {
  source: string
  action: string
  actor?: unknown
  input?: unknown
  output?: unknown
  capabilities: string[]
  replay: {
    mode: ReplayMode
    available: boolean
    reason?: string
  }
  evidence?: unknown
  metadata?: unknown
}

type ExternalReceiptPayload = {
  source?: unknown
  action?: unknown
  actor?: unknown
  input?: unknown
  output?: unknown
  capabilities?: unknown
  replay?: unknown
  evidence?: unknown
  metadata?: unknown
  ok?: unknown
  error?: unknown
  reason?: unknown
  parentId?: unknown
  supersedes?: unknown
  sessionId?: unknown
  artifact?: unknown
  timing?: unknown
}

// LabWorker class extending WorkerEntrypoint for proper RPC binding support
class LabWorker extends WorkerEntrypoint<Env> {
  async fetch(req: Request): Promise<Response> {
    const env = this.env
    const url = new URL(req.url)

    // CORS: when auth is off (public instance) we allow `*`. When auth is on
    // (self-host with `LAB_AUTH_TOKEN`), we don't echo `*` because that would
    // let any origin send a credentialed request — operators must opt in by
    // setting `LAB_CORS_ORIGIN` to their app origin (or "*" if they accept the risk).
    const authEnabled = !!(env.LAB_AUTH_TOKEN && env.LAB_AUTH_TOKEN.trim())
    const allowOrigin = authEnabled
      ? ((env as { LAB_CORS_ORIGIN?: string }).LAB_CORS_ORIGIN ?? "")
      : "*"
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    }
    if (allowOrigin) corsHeaders["Access-Control-Allow-Origin"] = allowOrigin

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    const withCors = (res: Response) => {
      for (const [k, v] of Object.entries(corsHeaders)) {
        res.headers.set(k, v)
      }
      return res
    }

    // --- Auth gate (no-op when LAB_AUTH_TOKEN is unset) ---
    const gate = authGate(req, { configuredTokens: env.LAB_AUTH_TOKEN, corsHeaders })
    if (!gate.ok) return gate.response

    if (req.method === "GET" && url.pathname === "/health") {
      return withCors(Response.json({ ok: true }))
    }

    const kvReadService = {
      get: (key: string) => Effect.promise((_signal) => env.KV.get(key)),
      list: (prefix?: string) =>
        Effect.promise(async (_signal) => {
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
      if (capNames.includes("petri")) caps.petri = true
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
        const aiResult = (await env.AI.run(AI_MODEL_DEFAULT as Parameters<typeof env.AI.run>[0], {
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
      const body = (await req.json()) as { name?: string; method?: string; path?: string; body?: unknown }
      if (typeof body.name !== "string" || !body.name) {
        return withCors(Response.json({ ok: false, error: "name required" }, { status: 400 }))
      }
      try {
        const method = typeof body.method === "string" && body.method.trim() ? body.method.trim().toUpperCase() : null
        if (!method) {
          return withCors(Response.json({ ok: false, error: "method required" }, { status: 400 }))
        }

        const rawPath = typeof body.path === "string" ? body.path : "/"
        const path = rawPath.trim() ? (rawPath.startsWith("/") ? rawPath : `/${rawPath}`) : "/"

        const id = env.LAB_DO.idFromName(body.name)
        const stub = env.LAB_DO.get(id)

        const requestUrl = `https://internal${path}`
        const hasGuestBody = body.body !== undefined

        const headers = new Headers()
        const requestInit: RequestInit = { method, headers }
        if (hasGuestBody) {
          headers.set("content-type", "application/json")
          requestInit.body = JSON.stringify(body.body)
        }

        const r = await stub.fetch(new Request(requestUrl, requestInit))

        let j: unknown
        try {
          j = await r.json()
        } catch {
          return withCors(Response.json({ ok: false, error: "durable object returned non-json" }, { status: 502 }))
        }

        if (!r.ok) {
          const err = j && typeof j === "object" && "error" in j && typeof (j as Record<string, unknown>).error === "string"
            ? (j as Record<string, unknown>).error
            : `durable object failed with status ${r.status}`
          return withCors(Response.json({ ok: false, error: err }, { status: r.status }))
        }

        return withCors(Response.json({ ok: true, result: j as Record<string, unknown> }))
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

    // --- Petri invoke routes (for sandboxed code to call via SELF) ---
    if (req.method === "POST" && url.pathname === "/invoke/petri") {
      if (!env.PETRI_DO) {
        return withCors(Response.json({ ok: false, error: "PETRI_DO not configured" }, { status: 503 }))
      }
      const body = (await req.json()) as { dishId?: string; mutations?: unknown[] }
      if (!body.dishId) {
        return withCors(Response.json({ ok: false, error: "dishId required" }, { status: 400 }))
      }
      try {
        const id = env.PETRI_DO.idFromName(body.dishId)
        const stub = env.PETRI_DO.get(id)
        // Forward to the DO's mutate endpoint
        const doReq = new Request("http://internal/petri/" + body.dishId + "/mutate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mutations: body.mutations || [] }),
        })
        const response = await stub.fetch(doReq)
        const data = await response.json()
        return withCors(Response.json(data))
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
    }

    if (req.method === "GET" && url.pathname === "/invoke/petri/snapshot") {
      if (!env.PETRI_DO) {
        return withCors(Response.json({ ok: false, error: "PETRI_DO not configured" }, { status: 503 }))
      }
      const dishId = url.searchParams.get("dishId")
      if (!dishId) {
        return withCors(Response.json({ ok: false, error: "dishId required" }, { status: 400 }))
      }
      try {
        const id = env.PETRI_DO.idFromName(dishId)
        const stub = env.PETRI_DO.get(id)
        const response = await stub.fetch(new Request("http://internal/petri/" + dishId + "/snapshot"))
        if (!response.ok) {
          const err = await response.json() as { error?: string }
          return withCors(Response.json({ ok: false, error: err.error || "snapshot failed" }, { status: response.status }))
        }
        const snapshot = await response.json() as { dishId?: string; state?: unknown; tick?: number }
        return withCors(Response.json({ ok: true, state: snapshot.state }))
      } catch (e) {
        return withCors(Response.json({ ok: false, error: getErrorMessage(e) }, { status: 500 }))
      }
    }

    // --- Petri Dish invoke routes ---
    if (url.pathname.startsWith("/petri/")) {
      if (!env.PETRI_DO) {
        return withCors(Response.json({ ok: false, error: "PETRI_DO binding not configured" }, { status: 503 }))
      }
      const dishId = url.pathname.split("/")[2]
      if (!dishId) {
        return withCors(Response.json({ ok: false, error: "dishId required" }, { status: 400 }))
      }
      
      const id = env.PETRI_DO.idFromName(dishId)
      const stub = env.PETRI_DO.get(id)
      const response = await stub.fetch(req)
      
      // For WebSocket upgrades, return the original response (can't copy webSocket)
      if (response.status === 101) {
        return response
      }
      
      // For regular responses, add CORS headers
      const newHeaders = new Headers(response.headers)
      for (const [k, v] of Object.entries(corsHeaders)) {
        newHeaders.set(k, v)
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      })
    }

    // --- Agent lookup: machine-readable cap templates + execute map ---
    if (req.method === "GET" && url.pathname === "/lab/catalog") {
      return withCors(Response.json(buildLabCatalog()))
    }

    const createExternalReceiptResponse = async (payload: ExternalReceiptPayload): Promise<Response> => {
      const receipt = normalizeExternalReceipt(payload)
      if (!receipt.ok) {
        return Response.json({ ok: false, error: receipt.error }, { status: 400 })
      }

      const timing = normalizeTiming(payload.timing)
      const outcomeOk = payload.ok === undefined ? true : Boolean(payload.ok)
      const outcome: ResultOutcome = outcomeOk
        ? { ok: true, result: receipt.value.output }
        : {
            ok: false,
            error: typeof payload.error === "string" ? payload.error : "external receipt failed",
            reason: typeof payload.reason === "string" ? payload.reason : undefined,
          }

      const sessionId = normalizeOptionalId(payload.sessionId)
      const artifact = normalizeArtifactRef(payload.artifact)
      const stored = await saveResult(env, {
        type: "external",
        request: {
          source: receipt.value.source,
          action: receipt.value.action,
          actor: receipt.value.actor,
          input: receipt.value.input,
          output: receipt.value.output,
          capabilities: receipt.value.capabilities,
          replay: receipt.value.replay,
          evidence: receipt.value.evidence,
          metadata: receipt.value.metadata,
          parentId: normalizeOptionalId(payload.parentId),
          supersedes: normalizeOptionalId(payload.supersedes),
          sessionId,
          ...(artifact ? { artifact } : {}),
        },
        outcome,
        ...(timing ? { timing } : {}),
        receipt: receipt.value,
        lineage: {
          ...(normalizeOptionalId(payload.parentId) ? { parentId: normalizeOptionalId(payload.parentId) } : {}),
          ...(normalizeOptionalId(payload.supersedes) ? { supersedes: normalizeOptionalId(payload.supersedes) } : {}),
        },
        ...(sessionId ? { sessionId } : {}),
        ...(artifact ? { artifact } : {}),
      })

      if (sessionId) await appendReceiptToSession(env, sessionId, stored.id)

      return Response.json({ ok: outcome.ok, resultId: stored.id })
    }

    if (req.method === "POST" && url.pathname === "/sessions") {
      return withCors(await handleCreateSession(req, env))
    }

    if (req.method === "GET" && url.pathname === "/sessions") {
      return withCors(Response.json({ ok: true, sessions: await listSessions(env) }))
    }

    const sessionMatch = url.pathname.match(/^\/sessions\/([a-z0-9]+)$/i)
    if (req.method === "GET" && sessionMatch) {
      const session = await getSession(env, sessionMatch[1])
      return withCors(session ? Response.json({ ok: true, session }) : Response.json({ ok: false, error: "session not found" }, { status: 404 }))
    }

    const sessionReceiptMatch = url.pathname.match(/^\/sessions\/([a-z0-9]+)\/receipts$/i)
    if (req.method === "POST" && sessionReceiptMatch) {
      const session = await getSession(env, sessionReceiptMatch[1])
      if (!session) {
        return withCors(Response.json({ ok: false, error: "session not found" }, { status: 404 }))
      }
      const payload = (await req.json()) as ExternalReceiptPayload
      return withCors(await createExternalReceiptResponse({ ...payload, sessionId: session.id }))
    }

    const sessionSummaryMatch = url.pathname.match(/^\/sessions\/([a-z0-9]+)\/summary$/i)
    if (req.method === "POST" && sessionSummaryMatch) {
      const payload = (await req.json().catch(() => ({}))) as Record<string, unknown>
      const session = await updateSessionSummary(env, sessionSummaryMatch[1], payload)
      return withCors(
        session
          ? Response.json({ ok: true, session, summary: session.summary })
          : Response.json({ ok: false, error: "session not found" }, { status: 404 }),
      )
    }

    // --- Saved-result JSON retrieval: /results/:id.json ---
    const bareResultMatch = url.pathname.match(/^\/results\/([a-z0-9]+)$/i)
    if (req.method === "GET" && bareResultMatch) {
      return withCors(
        new Response(null, {
          status: 307,
          headers: { Location: `${url.origin}/results/${bareResultMatch[1]}.json${url.search}` },
        }),
      )
    }

    const resultJsonMatch = url.pathname.match(/^\/results\/([a-z0-9]+)\.json$/i)
    if (req.method === "GET" && resultJsonMatch) {
      const resultId = resultJsonMatch[1]
      const savedResult = await getResult(env, resultId)
      if (!savedResult) {
        return withCors(Response.json({ error: "result not found" }, { status: 404 }))
      }
      return withCors(Response.json(savedResult))
    }

    const bareReceiptMatch = url.pathname.match(/^\/receipts\/([a-z0-9]+)$/i)
    if (req.method === "GET" && bareReceiptMatch) {
      return withCors(
        new Response(null, {
          status: 307,
          headers: { Location: `${url.origin}/receipts/${bareReceiptMatch[1]}.json${url.search}` },
        }),
      )
    }

    const receiptJsonMatch = url.pathname.match(/^\/receipts\/([a-z0-9]+)\.json$/i)
    if (req.method === "GET" && receiptJsonMatch) {
      const resultId = receiptJsonMatch[1]
      const savedResult = await getResult(env, resultId)
      if (!savedResult) {
        return withCors(Response.json({ error: "receipt not found" }, { status: 404 }))
      }
      return withCors(Response.json(savedResult))
    }

    // --- Seed KV with demo data ---
    if (req.method === "POST" && url.pathname === "/seed") {
      await env.KV.put("user:1", JSON.stringify({ name: "Alice", role: "admin" }))
      await env.KV.put("user:2", JSON.stringify({ name: "Bob", role: "viewer" }))
      await env.KV.put("user:3", JSON.stringify({ name: "Carol", role: "editor" }))
      await env.KV.put("config:theme", "dark")
      return withCors(Response.json({ ok: true, seeded: 4 }))
    }

    // --- External receipt ingestion ---
    if (req.method === "POST" && url.pathname === "/receipts") {
      const payload = (await req.json()) as ExternalReceiptPayload
      return withCors(await createExternalReceiptResponse(payload))
    }

    // --- Run code (optional capabilities) ---
    if (req.method === "POST" && url.pathname === "/run") {
      const json = (await req.json()) as Record<string, unknown>
      const parsed = parseGuestRunPayload({
        body: json.body,
        code: json.code,
        template: json.template,
      })
      if (!parsed) {
        return withCors(
          Response.json(
            { error: "need body (or legacy code) and optional template (default guest@v1)" },
            { status: 400 },
          ),
        )
      }
      const { body, template } = parsed
      const capNames = Array.isArray(json.capabilities) ? (json.capabilities as string[]) : []
      const runCaps = buildCapabilitySet(capNames, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(body, runCaps, undefined, template)
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithResult(
              env,
              {
                type: "sandbox",
                request: { template, body, capabilities: capNames },
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
            await respondWithResult(
              env,
              {
                type: "sandbox",
                request: { template, body, capabilities: capNames },
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
      const json = (await req.json()) as Record<string, unknown>
      const parsed = parseGuestRunPayload({
        body: json.body,
        code: json.code,
        template: json.template,
      })
      if (!parsed) {
        return withCors(
          Response.json(
            { error: "need body (or legacy code) and optional template (default guest@v1)" },
            { status: 400 },
          ),
        )
      }
      const { body, template } = parsed
      const extra = Array.isArray(json.capabilities) ? (json.capabilities as string[]) : []
      const capNames = [...new Set(["kvRead", ...extra])]
      const runCaps = buildCapabilitySet(capNames, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(body, runCaps, undefined, template)
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithResult(
              env,
              {
                type: "kv",
                request: { template, body, capabilities: capNames },
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
            await respondWithResult(
              env,
              {
                type: "kv",
                request: { template, body, capabilities: capNames },
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
      const payload = (await req.json()) as { steps?: unknown }
      const normalized = normalizeChainSteps(payload.steps)
      if (!normalized || normalized.length === 0) {
        return withCors(Response.json({ error: "no steps" }, { status: 400 }))
      }
      const stepsForRequest = chainStepsForResult(normalized)

      const runChain = Effect.gen(function* () {
        const isolate = yield* Isolate
        const steps: StepEntry[] = []
        let stepInput: unknown = undefined
        for (let i = 0; i < normalized.length; i++) {
          const step = normalized[i]
          const inputForRun =
            step.input !== undefined
              ? step.input
              : step.props !== undefined
                ? step.props
                : stepInput
          const t0 = Date.now()
          const caps = buildCapabilitySet(step.capabilities, undefined)
          const output = yield* isolate.run(step.body, caps, inputForRun, step.template)
          const ms = Date.now() - t0
          steps.push({
            step: i,
            name: step.name,
            template: step.template,
            body: step.body,
            capabilities: step.capabilities,
            input: inputForRun,
            output,
            ms,
          })
          stepInput = output
        }
        return { result: stepInput, steps }
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(runChain.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithResult(
              env,
              {
                type: "chain",
                request: { steps: stepsForRequest },
                outcome: { ok: false, error: failure.error, reason: failure.reason },
                timing: { totalMs },
                steps: [],
              },
              { ok: false, error: failure.error, reason: failure.reason, steps: [] },
              failure.status,
            ),
          )
        },
        onSuccess: async ({ result, steps }) =>
          withCors(
            await respondWithResult(
              env,
              {
                type: "chain",
                request: { steps: stepsForRequest },
                outcome: { ok: true, result },
                timing: { totalMs },
                steps,
              },
              { ok: true, result, steps },
            ),
          ),
      })
    }

    // --- Internal spawn child route ---
    if (req.method === "POST" && url.pathname === "/spawn/child") {
      const json = (await req.json()) as Record<string, unknown>
      const parsed = parseGuestRunPayload({
        body: json.body,
        code: json.code,
        template: json.template,
      })
      if (!parsed) {
        return withCors(Response.json({ ok: false, error: "invalid spawn child payload" }, { status: 400 }))
      }
      const capabilities = Array.isArray(json.capabilities) ? (json.capabilities as string[]) : []
      const depth = typeof json.depth === "number" ? json.depth : 0
      const childCaps = buildCapabilitySet(capabilities, depth)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(parsed.body, childCaps, undefined, parsed.template)
      })

      const layer = isolateLayer()
      return withCors(await runToResponse(program.pipe(Effect.provide(layer))))
    }

    // --- Spawn recursive isolates ---
    if (req.method === "POST" && url.pathname === "/run/spawn") {
      const json = (await req.json()) as Record<string, unknown>
      const parsed = parseGuestRunPayload({
        body: json.body,
        code: json.code,
        template: json.template,
      })
      if (!parsed) {
        return withCors(
          Response.json(
            { error: "need body (or legacy code) and optional template (default guest@v1)" },
            { status: 400 },
          ),
        )
      }
      const { body, template } = parsed
      const caps = Array.isArray(json.capabilities) ? (json.capabilities as string[]) : []
      if (!caps.includes("spawn")) {
        return withCors(Response.json({ ok: false, error: "spawn capability required" }, { status: 400 }))
      }
      const spawnDepth = typeof json.depth === "number" ? json.depth : 2
      const other = caps.filter((cap) => cap !== "spawn")
      const extraCaps = buildCapabilitySet(other, undefined)

      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.spawn(body, extraCaps, spawnDepth, template)
      })

      const layer = isolateLayer()
      const t0 = Date.now()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const totalMs = Date.now() - t0

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithResult(
              env,
              {
                type: "spawn",
                request: { template, body, capabilities: caps, depth: spawnDepth },
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
            await respondWithResult(
              env,
              {
                type: "spawn",
                request: { template, body, capabilities: caps, depth: spawnDepth },
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
      const json = (await req.json()) as Record<string, unknown>
      const prompt = typeof json.prompt === "string" ? json.prompt : ""
      if (!prompt) return withCors(Response.json({ error: "no prompt" }, { status: 400 }))
      const runInput = json.input
      const runMode: "code" | "json" = json.mode === "json" ? "json" : "code"
      const runTemplate = resolveGuestTemplateId(
        typeof json.template === "string" && json.template.trim() ? json.template.trim() : undefined,
      )
      if (!runTemplate) {
        return withCors(Response.json({ error: "unknown template" }, { status: 400 }))
      }

      const caps = Array.isArray(json.capabilities) ? (json.capabilities as string[]) : []
      const maxTokens = Math.min(4096, Math.max(256, typeof json.maxTokens === "number" ? json.maxTokens : 2048))
      const aiModel = typeof json.model === "string" && json.model.trim() ? json.model.trim() : AI_MODEL_DEFAULT
      const capSet = new Set(caps)
      const apiLines = CAPABILITY_REGISTRY.filter((row) => capSet.has(row.id as LabCapabilityId)).map(
        (row) => row.llmHint,
      )

      const systemPrompt = [
        runMode === "json"
          ? "You are a structured generator. Return valid JSON only."
          : "You are a code generator. You write JavaScript guest bodies (async statements, not a full module).",
        runMode === "json"
          ? "The user describes what they want. Return ONLY a JSON object — no markdown, no explanation."
          : "The user describes what they want. You return ONLY the body — no markdown, no explanation.",
        runMode === "json"
          ? "Structured input is available as top-level `input` context."
          : "The body is inserted into a host shell (`guest@v1`) and runs inside an async IIFE in a sandboxed V8 isolate.",
        "Structured input is available as a top-level `input` variable.",
        runMode === "json" ? "Do not return code. Emit JSON directly." : "Return the final value with `return`.",
        apiLines.length > 0
          ? "Available APIs:\n" + apiLines.join("\n")
          : "No external APIs available. Pure compute only.",
        runMode === "json"
          ? "Output must be parseable JSON object (double-quoted keys/strings)."
          : "Do NOT use import/export. Do NOT use fetch. Do NOT use console.log.",
        runMode === "json"
          ? "No code fences. No comments. JSON only."
          : "Do NOT wrap in an async function or IIFE. The code already runs inside an async context.",
        runMode === "json"
          ? "Do not include surrounding text."
          : "Use `return` at the TOP LEVEL to return the final value. Example: `const x = await kv.list(); return x;`",
        runMode === "json" ? "No trailing commas." : "Do NOT use .then() chains. Use await instead.",
      ].join("\n")

      const t0 = Date.now()

      let aiResult: { response?: string }
      try {
        aiResult = (await env.AI.run(aiModel as Parameters<typeof env.AI.run>[0], {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        })) as { response?: string }
      } catch (error) {
        const message = getErrorMessage(error)
        return withCors(
          await respondWithResult(
            env,
            {
              type: "generate",
              request: { mode: runMode, template: runTemplate, prompt, capabilities: caps, input: runInput },
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

      if (runMode === "json") {
        const parsed = normalizeGeneratedJson(raw)
        if (!parsed.ok) {
          return withCors(
            await respondWithResult(
              env,
              {
                type: "generate",
                request: { mode: runMode, template: runTemplate, prompt, capabilities: caps, input: runInput },
                outcome: { ok: false, error: parsed.error },
                timing: { totalMs: generateMs, generateMs, runMs: 0 },
                generated: raw,
              },
              { ok: false, error: parsed.error, generated: raw, generateMs, runMs: 0 },
              500,
            ),
          )
        }

        return withCors(
          await respondWithResult(
            env,
            {
              type: "generate",
              request: { mode: runMode, template: runTemplate, prompt, capabilities: caps, input: runInput },
              outcome: { ok: true, result: parsed.value },
              timing: { totalMs: generateMs, generateMs, runMs: 0 },
              generated: raw,
            },
            { ok: true, result: parsed.value, generated: raw, generateMs, runMs: 0 },
          ),
        )
      }

      const genCode = normalizeGenerated(raw)

      if (!genCode) {
        return withCors(
          await respondWithResult(
            env,
            {
              type: "generate",
              request: { mode: runMode, template: runTemplate, prompt, capabilities: caps, input: runInput },
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
        return yield* isolate.run(genCode, runCaps, runInput, runTemplate)
      })

      const layer = isolateLayer()
      const exit = await Effect.runPromiseExit(program.pipe(Effect.provide(layer)))
      const runMs = Date.now() - t0 - generateMs

      return await Exit.match(exit, {
        onFailure: async (cause) => {
          const failure = getFailureDetails(cause)
          return withCors(
            await respondWithResult(
              env,
              {
                type: "generate",
                request: { mode: runMode, template: runTemplate, prompt, capabilities: caps, input: runInput },
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
            await respondWithResult(
              env,
              {
                type: "generate",
                request: { mode: runMode, template: runTemplate, prompt, capabilities: caps, input: runInput },
                outcome: { ok: true, result },
                timing: { totalMs: generateMs + runMs, generateMs, runMs },
                generated: genCode,
              },
              { ok: true, result, generated: genCode, generateMs, runMs },
            ),
            ),
      })
    }

    // --- Story routes ---
    // POST /stories - Create story from traceIds
    if (req.method === "POST" && url.pathname === "/stories") {
      const body = (await req.json()) as CreateStoryRequest
      const result = await handleCreateStory(env, body)
      return withCors(Response.json(result, { status: result.ok ? 201 : 400 }))
    }

    // GET /stories - List stories
    if (req.method === "GET" && url.pathname === "/stories") {
      const createdBy = url.searchParams.get("createdBy") || undefined
      const status = url.searchParams.get("status") as StoryStatus | undefined
      const visibility = url.searchParams.get("visibility") as "private" | "team" | "public" | undefined
      const limit = url.searchParams.has("limit") ? parseInt(url.searchParams.get("limit")!, 10) : undefined
      const offset = url.searchParams.has("offset") ? parseInt(url.searchParams.get("offset")!, 10) : undefined

      const result = await handleListStories(env, { createdBy, status, visibility, limit, offset })
      return withCors(Response.json(result, { status: result.ok ? 200 : 400 }))
    }

    // GET /stories/:id - Get story with chapters
    const storyGetMatch = url.pathname.match(/^\/stories\/([a-z0-9]+)$/i)
    if (req.method === "GET" && storyGetMatch) {
      const storyId = storyGetMatch[1]
      const result = await handleGetStory(env, storyId)
      return withCors(Response.json(result, { status: result.ok ? 200 : 404 }))
    }

    // POST /stories/:id/fork - Fork from chapter
    const storyForkMatch = url.pathname.match(/^\/stories\/([a-z0-9]+)\/fork$/i)
    if (req.method === "POST" && storyForkMatch) {
      const storyId = storyForkMatch[1]
      const body = (await req.json()) as ForkStoryRequest
      const result = await handleForkStory(env, storyId, body)
      return withCors(Response.json(result, { status: result.ok ? 201 : 400 }))
    }

    // POST /stories/:id/append - Add trace to story
    const storyAppendMatch = url.pathname.match(/^\/stories\/([a-z0-9]+)\/append$/i)
    if (req.method === "POST" && storyAppendMatch) {
      const storyId = storyAppendMatch[1]
      const body = (await req.json()) as AppendToStoryRequest
      const result = await handleAppendToStory(env, storyId, body)
      return withCors(Response.json(result, { status: result.ok ? 201 : 400 }))
    }

    // PATCH /stories/:id/status - Update story status
    const storyStatusMatch = url.pathname.match(/^\/stories\/([a-z0-9]+)\/status$/i)
    if (req.method === "PATCH" && storyStatusMatch) {
      const storyId = storyStatusMatch[1]
      const body = (await req.json()) as { status: StoryStatus }
      if (!body.status) {
        return withCors(Response.json({ ok: false, error: "status required" }, { status: 400 }))
      }
      const result = await handleUpdateStoryStatus(env, storyId, body.status)
      return withCors(Response.json(result, { status: result.ok ? 200 : 400 }))
    }

    // --- Self-healing loop routes ---
    // POST /diagnose - Analyze a failed trace and return structured diagnosis
    if (req.method === "POST" && url.pathname === "/diagnose") {
      return withCors(await handleDiagnose(req, env))
    }

    // POST /propose - Given a diagnosis, propose a fix
    if (req.method === "POST" && url.pathname === "/propose") {
      return withCors(await handlePropose(req, env))
    }

    // POST /verify - Run a proposed fix and return a new trace
    if (req.method === "POST" && url.pathname === "/verify") {
      return withCors(await handleVerify(req, env))
    }

    // POST /compare - Compare two traces and return diff
    if (req.method === "POST" && url.pathname === "/compare") {
      return withCors(await handleCompare(req, env))
    }

    return withCors(Response.json({ error: "not found" }, { status: 404 }))
  }
}

export default LabWorker

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

function normalizeGeneratedJson(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/gm, "")
    .replace(/^```\s*$/gm, "")
    .trim()
  try {
    return { ok: true, value: JSON.parse(cleaned) as unknown }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid JSON"
    return { ok: false, error: `LLM returned invalid JSON: ${msg}` }
  }
}

async function runToResponse(
  effect: Effect.Effect<unknown, IsolateError>,
): Promise<Response> {
  const exit = await Effect.runPromiseExit(effect)
  return Exit.match(exit, {
    onFailure: (cause) => {
      for (const reason of cause.reasons) {
        if (Cause.isFailReason(reason) && reason.error instanceof IsolateError) {
          const err = reason.error as { message: string; reason: string }
          return Response.json(
            { ok: false, reason: err.reason, error: err.message },
            { status: 500 },
          )
        }
      }
      return Response.json({ ok: false, error: Cause.pretty(cause) }, { status: 500 })
    },
    onSuccess: (result) => Response.json({ ok: true, result }),
  })
}

async function respondWithResult(
  env: Env,
  result: Omit<StoredResult, "id" | "createdAt">,
  body: Record<string, unknown>,
  status = 200,
): Promise<Response> {
  const stored = await saveResult(env, result)
  return Response.json({ ...body, resultId: stored.id }, { status })
}

async function saveResult(
  env: Env,
  result: Omit<StoredResult, "id" | "createdAt">,
): Promise<StoredResult> {
  const stored: StoredResult = {
    ...result,
    id: makeResultId(),
    createdAt: new Date().toISOString(),
  }
  await env.KV.put(getResultKey(stored.id), JSON.stringify(stored))
  return stored
}

async function getResult(env: Env, resultId: string): Promise<StoredResult | null> {
  const raw = await env.KV.get(getResultKey(resultId))
  if (!raw) return null
  return JSON.parse(raw) as StoredResult
}

function getResultKey(resultId: string): string {
  return `result:${resultId}`
}

function makeResultId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10)
}

function normalizeExternalReceipt(
  payload: ExternalReceiptPayload,
): { ok: true; value: ExternalReceiptStored } | { ok: false; error: string } {
  const source = typeof payload.source === "string" ? payload.source.trim() : ""
  const action = typeof payload.action === "string" ? payload.action.trim() : ""
  if (!source) return { ok: false, error: "source is required" }
  if (!action) return { ok: false, error: "action is required" }

  const capabilities = Array.isArray(payload.capabilities)
    ? payload.capabilities.filter((cap): cap is string => typeof cap === "string" && cap.trim().length > 0)
    : []

  return {
    ok: true,
    value: {
      source,
      action,
      ...(payload.actor !== undefined ? { actor: payload.actor } : {}),
      ...(payload.input !== undefined ? { input: payload.input } : {}),
      ...(payload.output !== undefined ? { output: payload.output } : {}),
      capabilities,
      replay: normalizeReplay(payload.replay),
      ...(payload.evidence !== undefined ? { evidence: payload.evidence } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
    },
  }
}

function normalizeReplay(value: unknown): ExternalReceiptStored["replay"] {
  const allowed = new Set<ReplayMode>([
    "inspect-only",
    "rerun-sandbox",
    "rerun-live-requires-approval",
    "continue-from-here",
  ])
  if (!value || typeof value !== "object") {
    return { mode: "inspect-only", available: false, reason: "No replay metadata provided" }
  }
  const obj = value as Record<string, unknown>
  const mode = typeof obj.mode === "string" && allowed.has(obj.mode as ReplayMode)
    ? (obj.mode as ReplayMode)
    : "inspect-only"
  const available = typeof obj.available === "boolean" ? obj.available : mode !== "inspect-only"
  const reason = typeof obj.reason === "string" ? obj.reason : undefined
  return { mode, available, ...(reason ? { reason } : {}) }
}

function normalizeOptionalId(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeArtifactRef(value: unknown): ArtifactRef | undefined {
  if (!value || typeof value !== "object") return undefined
  const obj = value as Record<string, unknown>
  if (typeof obj.repo !== "string" || !obj.repo.trim()) return undefined
  return {
    provider: "cloudflare-artifacts",
    repo: obj.repo.trim(),
    ...(typeof obj.branch === "string" && obj.branch.trim() ? { branch: obj.branch.trim() } : {}),
    ...(typeof obj.head === "string" && obj.head.trim() ? { head: obj.head.trim() } : {}),
    ...(typeof obj.remote === "string" && obj.remote.trim() ? { remote: obj.remote.trim() } : {}),
  }
}

function normalizeTiming(value: unknown): StoredResult["timing"] | undefined {
  if (!value || typeof value !== "object") return undefined
  const obj = value as Record<string, unknown>
  const timing: StoredResult["timing"] = {}
  if (typeof obj.totalMs === "number") timing.totalMs = obj.totalMs
  if (typeof obj.generateMs === "number") timing.generateMs = obj.generateMs
  if (typeof obj.runMs === "number") timing.runMs = obj.runMs
  return Object.keys(timing).length > 0 ? timing : undefined
}

function getFailureDetails(cause: Cause.Cause<unknown>) {
  for (const reason of cause.reasons) {
    if (Cause.isFailReason(reason) && reason.error instanceof IsolateError) {
      // Access the error properties directly from the instance
      const err = reason.error as { message: string; reason: string }
      return {
        status: 500,
        error: err.message,
        reason: err.reason,
      }
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
