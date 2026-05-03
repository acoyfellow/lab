export type ArtifactRef = {
  provider: "cloudflare-artifacts"
  repo: string
  branch?: string
  head?: string
  remote?: string
}

export type LabSessionStatus = "active" | "handoff" | "complete" | "failed"

export type LabSessionSummary = {
  goal?: string
  state?: string
  nextAction?: string
  risks: string[]
  importantReceiptIds: string[]
  updatedByReceiptId?: string
  updatedAt: string
}

export type LabSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  status: LabSessionStatus
  artifact: ArtifactRef
  receiptIds: string[]
  summary?: LabSessionSummary
}

type SessionEnv = {
  KV: KVNamespace
}

type CreateSessionPayload = {
  title?: unknown
  artifact?: unknown
}

type UpdateSessionSummaryPayload = {
  goal?: unknown
  state?: unknown
  nextAction?: unknown
  risks?: unknown
  importantReceiptIds?: unknown
  updatedByReceiptId?: unknown
}

function makeId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12)
}

function sessionKey(id: string): string {
  return `session:${id}`
}

function sessionIndexKey(): string {
  return "sessions:index"
}

function sessionReceiptKey(sessionId: string, receiptId: string): string {
  return `session:${sessionId}:receipt:${receiptId}`
}

async function listSessionReceiptIds(env: SessionEnv, sessionId: string, existing: string[] = []): Promise<string[]> {
  const prefix = `session:${sessionId}:receipt:`
  const listed = await env.KV.list({ prefix })
  const indexed = listed.keys
    .map((key) => key.name.slice(prefix.length))
    .filter(Boolean)
  return [...new Set([...existing, ...indexed])]
}

function normalizeArtifact(value: unknown, sessionId: string): ArtifactRef {
  if (!value || typeof value !== "object") {
    return {
      provider: "cloudflare-artifacts",
      repo: `lab-session-${sessionId}`,
      branch: "main",
    }
  }
  const obj = value as Record<string, unknown>
  return {
    provider: "cloudflare-artifacts",
    repo: typeof obj.repo === "string" && obj.repo.trim() ? obj.repo.trim() : `lab-session-${sessionId}`,
    branch: typeof obj.branch === "string" && obj.branch.trim() ? obj.branch.trim() : "main",
    ...(typeof obj.head === "string" && obj.head.trim() ? { head: obj.head.trim() } : {}),
    ...(typeof obj.remote === "string" && obj.remote.trim() ? { remote: obj.remote.trim() } : {}),
  }
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
}

export async function saveSession(env: SessionEnv, session: LabSession): Promise<void> {
  await env.KV.put(sessionKey(session.id), JSON.stringify(session))
  const raw = await env.KV.get(sessionIndexKey())
  const ids = raw ? (JSON.parse(raw) as string[]) : []
  if (!ids.includes(session.id)) {
    ids.unshift(session.id)
    await env.KV.put(sessionIndexKey(), JSON.stringify(ids.slice(0, 100)))
  }
}

export async function getSession(env: SessionEnv, id: string): Promise<LabSession | null> {
  const raw = await env.KV.get(sessionKey(id))
  if (!raw) return null
  const session = JSON.parse(raw) as LabSession
  session.receiptIds = await listSessionReceiptIds(env, id, session.receiptIds)
  return session
}

export async function listSessions(env: SessionEnv): Promise<LabSession[]> {
  const raw = await env.KV.get(sessionIndexKey())
  const ids = raw ? (JSON.parse(raw) as string[]) : []
  const sessions = await Promise.all(ids.map((id) => getSession(env, id)))
  return sessions.filter((s): s is LabSession => Boolean(s))
}

export async function appendReceiptToSession(env: SessionEnv, sessionId: string, receiptId: string): Promise<LabSession | null> {
  const session = await getSession(env, sessionId)
  if (!session) return null
  await env.KV.put(sessionReceiptKey(sessionId, receiptId), new Date().toISOString())
  if (!session.receiptIds.includes(receiptId)) session.receiptIds.push(receiptId)
  session.updatedAt = new Date().toISOString()
  await saveSession(env, session)
  return session
}

export async function updateSessionSummary(
  env: SessionEnv,
  sessionId: string,
  payload: UpdateSessionSummaryPayload,
): Promise<LabSession | null> {
  const session = await getSession(env, sessionId)
  if (!session) return null
  const previous = session.summary
  session.summary = {
    goal: optionalText(payload.goal) ?? previous?.goal,
    state: optionalText(payload.state) ?? previous?.state,
    nextAction: optionalText(payload.nextAction) ?? previous?.nextAction,
    risks: Array.isArray(payload.risks) ? stringList(payload.risks) : (previous?.risks ?? []),
    importantReceiptIds: Array.isArray(payload.importantReceiptIds)
      ? stringList(payload.importantReceiptIds)
      : (previous?.importantReceiptIds ?? []),
    updatedByReceiptId: optionalText(payload.updatedByReceiptId) ?? previous?.updatedByReceiptId,
    updatedAt: new Date().toISOString(),
  }
  session.updatedAt = session.summary.updatedAt
  await saveSession(env, session)
  return session
}

export async function handleCreateSession(req: Request, env: SessionEnv): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as CreateSessionPayload
  const id = makeId()
  const now = new Date().toISOString()
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Untitled agent session"
  const session: LabSession = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    status: "active",
    artifact: normalizeArtifact(body.artifact, id),
    receiptIds: [],
  }
  await saveSession(env, session)
  return Response.json({ ok: true, session, sessionId: id }, { status: 201 })
}
