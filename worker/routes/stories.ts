/**
 * Story composition routes for trace narratives
 * Allows multiple traces to compose into stories for debugging and team review
 */

import type { WorkerLoaderBinding } from "../Loader"

// Story status types
export type StoryStatus = "in-progress" | "completed" | "failed" | "approved"
export type StoryVisibility = "private" | "team" | "public"

// Story interfaces
export interface Story {
  id: string
  title: string
  createdAt: string
  createdBy?: string
  status: StoryStatus
  visibility: StoryVisibility
  tags?: string[]
  chapters?: StoryChapter[]
}

export interface StoryChapter {
  id: string
  storyId: string
  chapterIndex: number
  traceId: string
  title?: string
  summary?: string
  decisionPoint?: DecisionPoint
}

export interface DecisionPoint {
  question: string
  options: string[]
  chosen: number
  reasoning: string
}

// Database row types
interface StoryRow {
  id: string
  title: string
  created_at: string
  created_by: string | null
  status: string
  visibility: string
  tags: string | null
}

interface ChapterRow {
  id: string
  story_id: string
  chapter_index: number
  trace_id: string
  title: string | null
  summary: string | null
  decision_point: string | null
}

// Request/response types
export interface CreateStoryRequest {
  title: string
  traceIds: string[]
  createdBy?: string
  visibility?: StoryVisibility
  tags?: string[]
}

export interface CreateStoryResponse {
  ok: boolean
  story?: Story
  error?: string
}

export interface GetStoryResponse {
  ok: boolean
  story?: Story
  error?: string
}

export interface ForkStoryRequest {
  fromChapterIndex: number
  newTitle?: string
}

export interface ForkStoryResponse {
  ok: boolean
  story?: Story
  error?: string
}

export interface AppendToStoryRequest {
  traceId: string
}

export interface AppendToStoryResponse {
  ok: boolean
  chapter?: StoryChapter
  error?: string
}

// Environment interface
interface StoriesEnv {
  ENGINE_D1?: D1Database
  AI?: Ai
  LOADER: WorkerLoaderBinding
  KV: KVNamespace
  SELF: Fetcher
}

// Helper to generate IDs
function makeStoryId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16)
}

// Helper to get trace result from KV
async function getTraceResult(env: StoriesEnv, traceId: string): Promise<unknown | null> {
  const raw = await env.KV.get(`result:${traceId}`)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Generate summary via Workers AI
async function generateChapterSummary(
  env: StoriesEnv,
  traceResult: unknown
): Promise<string | undefined> {
  if (!env.AI) return undefined

  try {
    const resultStr = JSON.stringify(traceResult).slice(0, 4000)
    const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "system",
          content: "You are a debugging assistant. Summarize the following trace result in 1-2 sentences. Focus on what happened and any key outcomes or errors. Be concise."
        },
        {
          role: "user",
          content: `Trace result: ${resultStr}`
        }
      ],
      max_tokens: 128,
      temperature: 0.2,
    }) as { response?: string }

    return aiResult.response?.trim()
  } catch {
    return undefined
  }
}

// Generate chapter title via Workers AI
async function generateChapterTitle(
  env: StoriesEnv,
  traceResult: unknown,
  index: number
): Promise<string | undefined> {
  if (!env.AI) return `Chapter ${index + 1}`

  try {
    const resultStr = JSON.stringify(traceResult).slice(0, 2000)
    const aiResult = await env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, {
      messages: [
        {
          role: "system",
          content: "Generate a short, descriptive title (3-6 words) for this trace. Just return the title, no quotes or explanation."
        },
        {
          role: "user",
          content: `Trace: ${resultStr}`
        }
      ],
      max_tokens: 32,
      temperature: 0.3,
    }) as { response?: string }

    const title = aiResult.response?.trim().replace(/^["']|["']$/g, "")
    return title || `Chapter ${index + 1}`
  } catch {
    return `Chapter ${index + 1}`
  }
}

// Detect decision points in trace data
function detectDecisionPoint(traceResult: unknown): DecisionPoint | undefined {
  if (!traceResult || typeof traceResult !== "object") return undefined

  const result = traceResult as Record<string, unknown>

  // Check for decision-related patterns in the result
  const outcome = result.outcome as Record<string, unknown> | undefined
  if (outcome) {
    // Check for error/retry patterns
    if (outcome.error && result.steps && Array.isArray(result.steps)) {
      return {
        question: "How should we handle this error?",
        options: ["Retry", "Skip", "Fail", "Heal"],
        chosen: outcome.ok ? 3 : 1, // Heal if eventually ok, Skip if failed
        reasoning: outcome.ok
          ? "Self-healing was applied successfully"
          : `Error: ${outcome.error}`
      }
    }

    // Check for branching/canary patterns
    if (result.request && typeof result.request === "object") {
      const req = result.request as Record<string, unknown>
      if (req.steps && Array.isArray(req.steps) && req.steps.length > 1) {
        return {
          question: "Which execution path was taken?",
          options: req.steps.map((s: unknown, i: number) => `Step ${i + 1}: ${(s as Record<string, unknown>).name || "unnamed"}`),
          chosen: 0,
          reasoning: "Sequential chain execution"
        }
      }
    }
  }

  return undefined
}

// Create story handler
export async function handleCreateStory(
  env: StoriesEnv,
  request: CreateStoryRequest
): Promise<CreateStoryResponse> {
  if (!env.ENGINE_D1) {
    return { ok: false, error: "Stories database not configured" }
  }

  if (!request.title?.trim()) {
    return { ok: false, error: "Title is required" }
  }

  if (!Array.isArray(request.traceIds) || request.traceIds.length === 0) {
    return { ok: false, error: "At least one traceId is required" }
  }

  const storyId = makeStoryId()
  const now = new Date().toISOString()
  const visibility = request.visibility || "private"
  const tagsJson = request.tags ? JSON.stringify(request.tags) : null

  try {
    // Insert story
    await env.ENGINE_D1.prepare(
      `INSERT INTO stories (id, title, created_at, created_by, status, visibility, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      storyId,
      request.title,
      now,
      request.createdBy || null,
      "in-progress",
      visibility,
      tagsJson
    ).run()

    // Create chapters for each trace
    const chapters: StoryChapter[] = []
    for (let i = 0; i < request.traceIds.length; i++) {
      const traceId = request.traceIds[i]
      const chapterId = makeStoryId()

      // Fetch trace result for summary generation
      const traceResult = await getTraceResult(env, traceId)

      // Generate title and summary via AI
      const [title, summary] = await Promise.all([
        generateChapterTitle(env, traceResult, i),
        generateChapterSummary(env, traceResult)
      ])

      // Detect decision points
      const decisionPoint = traceResult ? detectDecisionPoint(traceResult) : undefined

      await env.ENGINE_D1.prepare(
        `INSERT INTO story_chapters (id, story_id, chapter_index, trace_id, title, summary, decision_point)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        chapterId,
        storyId,
        i,
        traceId,
        title || null,
        summary || null,
        decisionPoint ? JSON.stringify(decisionPoint) : null
      ).run()

      chapters.push({
        id: chapterId,
        storyId,
        chapterIndex: i,
        traceId,
        title: title || undefined,
        summary: summary || undefined,
        decisionPoint: decisionPoint || undefined
      })
    }

    return {
      ok: true,
      story: {
        id: storyId,
        title: request.title,
        createdAt: now,
        createdBy: request.createdBy,
        status: "in-progress",
        visibility,
        tags: request.tags,
        chapters
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Get story handler
export async function handleGetStory(
  env: StoriesEnv,
  storyId: string
): Promise<GetStoryResponse> {
  if (!env.ENGINE_D1) {
    return { ok: false, error: "Stories database not configured" }
  }

  try {
    // Get story
    const storyRow = await env.ENGINE_D1.prepare(
      `SELECT * FROM stories WHERE id = ?`
    ).bind(storyId).first<StoryRow>()

    if (!storyRow) {
      return { ok: false, error: "Story not found" }
    }

    // Get chapters
    const chapterRows = await env.ENGINE_D1.prepare(
      `SELECT * FROM story_chapters WHERE story_id = ? ORDER BY chapter_index ASC`
    ).bind(storyId).all<ChapterRow>()

    const chapters: StoryChapter[] = (chapterRows.results || []).map(row => ({
      id: row.id,
      storyId: row.story_id,
      chapterIndex: row.chapter_index,
      traceId: row.trace_id,
      title: row.title || undefined,
      summary: row.summary || undefined,
      decisionPoint: row.decision_point ? JSON.parse(row.decision_point) as DecisionPoint : undefined
    }))

    return {
      ok: true,
      story: {
        id: storyRow.id,
        title: storyRow.title,
        createdAt: storyRow.created_at,
        createdBy: storyRow.created_by || undefined,
        status: storyRow.status as StoryStatus,
        visibility: storyRow.visibility as StoryVisibility,
        tags: storyRow.tags ? JSON.parse(storyRow.tags) as string[] : undefined,
        chapters
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Fork story handler
export async function handleForkStory(
  env: StoriesEnv,
  storyId: string,
  request: ForkStoryRequest
): Promise<ForkStoryResponse> {
  if (!env.ENGINE_D1) {
    return { ok: false, error: "Stories database not configured" }
  }

  try {
    // Get original story
    const originalStory = await handleGetStory(env, storyId)
    if (!originalStory.ok || !originalStory.story) {
      return { ok: false, error: "Original story not found" }
    }

    const chapters = originalStory.story.chapters || []
    if (request.fromChapterIndex < 0 || request.fromChapterIndex >= chapters.length) {
      return { ok: false, error: "Invalid chapter index" }
    }

    // Create new story from fork point
    const newStoryId = makeStoryId()
    const now = new Date().toISOString()
    const newTitle = request.newTitle || `${originalStory.story.title} (forked)`

    // Insert new story
    await env.ENGINE_D1.prepare(
      `INSERT INTO stories (id, title, created_at, created_by, status, visibility, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      newStoryId,
      newTitle,
      now,
      originalStory.story.createdBy || null,
      "in-progress",
      originalStory.story.visibility,
      originalStory.story.tags ? JSON.stringify(originalStory.story.tags) : null
    ).run()

    // Copy chapters up to and including fork point
    const newChapters: StoryChapter[] = []
    for (let i = 0; i <= request.fromChapterIndex; i++) {
      const originalChapter = chapters[i]
      const newChapterId = makeStoryId()

      await env.ENGINE_D1.prepare(
        `INSERT INTO story_chapters (id, story_id, chapter_index, trace_id, title, summary, decision_point)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newChapterId,
        newStoryId,
        i,
        originalChapter.traceId,
        originalChapter.title || null,
        originalChapter.summary || null,
        originalChapter.decisionPoint ? JSON.stringify(originalChapter.decisionPoint) : null
      ).run()

      newChapters.push({
        id: newChapterId,
        storyId: newStoryId,
        chapterIndex: i,
        traceId: originalChapter.traceId,
        title: originalChapter.title,
        summary: originalChapter.summary,
        decisionPoint: originalChapter.decisionPoint
      })
    }

    return {
      ok: true,
      story: {
        id: newStoryId,
        title: newTitle,
        createdAt: now,
        createdBy: originalStory.story.createdBy,
        status: "in-progress",
        visibility: originalStory.story.visibility,
        tags: originalStory.story.tags,
        chapters: newChapters
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Append to story handler
export async function handleAppendToStory(
  env: StoriesEnv,
  storyId: string,
  request: AppendToStoryRequest
): Promise<AppendToStoryResponse> {
  if (!env.ENGINE_D1) {
    return { ok: false, error: "Stories database not configured" }
  }

  try {
    // Get current max chapter index
    const maxIndexRow = await env.ENGINE_D1.prepare(
      `SELECT MAX(chapter_index) as max_index FROM story_chapters WHERE story_id = ?`
    ).bind(storyId).first<{ max_index: number | null }>()

    const newIndex = (maxIndexRow?.max_index ?? -1) + 1

    // Fetch trace result for summary generation
    const traceResult = await getTraceResult(env, request.traceId)

    // Generate title and summary via AI
    const [title, summary] = await Promise.all([
      generateChapterTitle(env, traceResult, newIndex),
      generateChapterSummary(env, traceResult)
    ])

    // Detect decision points
    const decisionPoint = traceResult ? detectDecisionPoint(traceResult) : undefined

    const chapterId = makeStoryId()

    await env.ENGINE_D1.prepare(
      `INSERT INTO story_chapters (id, story_id, chapter_index, trace_id, title, summary, decision_point)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      chapterId,
      storyId,
      newIndex,
      request.traceId,
      title || null,
      summary || null,
      decisionPoint ? JSON.stringify(decisionPoint) : null
    ).run()

    return {
      ok: true,
      chapter: {
        id: chapterId,
        storyId,
        chapterIndex: newIndex,
        traceId: request.traceId,
        title: title || undefined,
        summary: summary || undefined,
        decisionPoint: decisionPoint || undefined
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Update story status
export async function handleUpdateStoryStatus(
  env: StoriesEnv,
  storyId: string,
  status: StoryStatus
): Promise<{ ok: boolean; error?: string }> {
  if (!env.ENGINE_D1) {
    return { ok: false, error: "Stories database not configured" }
  }

  try {
    await env.ENGINE_D1.prepare(
      `UPDATE stories SET status = ? WHERE id = ?`
    ).bind(status, storyId).run()

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// List stories
export async function handleListStories(
  env: StoriesEnv,
  options: {
    createdBy?: string
    status?: StoryStatus
    visibility?: StoryVisibility
    limit?: number
    offset?: number
  } = {}
): Promise<{ ok: boolean; stories?: Story[]; error?: string }> {
  if (!env.ENGINE_D1) {
    return { ok: false, error: "Stories database not configured" }
  }

  try {
    let query = `SELECT * FROM stories WHERE 1=1`
    const params: (string | number)[] = []

    if (options.createdBy) {
      query += ` AND created_by = ?`
      params.push(options.createdBy)
    }

    if (options.status) {
      query += ` AND status = ?`
      params.push(options.status)
    }

    if (options.visibility) {
      query += ` AND visibility = ?`
      params.push(options.visibility)
    }

    query += ` ORDER BY created_at DESC`

    // SQLite/D1 require LIMIT to be present whenever OFFSET is used.
    // If the caller supplied only `offset`, inject the SQLite sentinel
    // `LIMIT -1` (meaning "no limit") so the query parses.
    if (options.limit || options.offset) {
      query += ` LIMIT ?`
      params.push(options.limit ?? -1)
    }

    if (options.offset) {
      query += ` OFFSET ?`
      params.push(options.offset)
    }

    const rows = await env.ENGINE_D1.prepare(query).bind(...params).all<StoryRow>()

    const stories: Story[] = (rows.results || []).map(row => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      createdBy: row.created_by || undefined,
      status: row.status as StoryStatus,
      visibility: row.visibility as StoryVisibility,
      tags: row.tags ? JSON.parse(row.tags) as string[] : undefined
    }))

    return { ok: true, stories }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
