import { DurableObject } from "cloudflare:workers"

/**
 * Stateful Durable Object backing the `durableObjectFetch` capability.
 *
 * Guest code calls `labDo.fetch(name, { method, path, body })`.
 * `path` is treated as the storage key (pathname).
 *
 * SQL endpoints (path starts with /sql):
 *   POST /sql/exec  { sql, params? }  — run a write query
 *   POST /sql/query { sql, params? }  — run a read query, returns rows
 */
export class LabStubDurableObject extends DurableObject {
  private sqlReady = false

  private ensureSql() {
    if (this.sqlReady) return
    // Create the games table if it doesn't exist
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        outcome TEXT NOT NULL,
        moves INTEGER NOT NULL,
        trace_ids TEXT NOT NULL,
        insight TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    this.sqlReady = true
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const pathname = url.pathname.replace(/^\/+/, "") || "_"
    const method = request.method.toUpperCase()

    // --- SQL endpoints ---
    if (pathname.startsWith("sql/")) {
      this.ensureSql()
      if (method !== "POST") {
        return Response.json({ error: "POST required for sql" }, { status: 405 })
      }

      let body: { sql: string; params?: unknown[] }
      try {
        body = await request.json() as { sql: string; params?: unknown[] }
      } catch {
        return Response.json({ error: "json body required" }, { status: 400 })
      }

      if (typeof body.sql !== "string") {
        return Response.json({ error: "sql string required" }, { status: 400 })
      }

      const op = pathname.slice(4) // "exec" or "query"
      try {
        if (op === "query") {
          const cursor = body.params?.length
            ? this.ctx.storage.sql.exec(body.sql, ...body.params)
            : this.ctx.storage.sql.exec(body.sql)
          const rows = cursor.toArray()
          return Response.json({ ok: true, rows })
        }

        if (op === "exec") {
          if (body.params?.length) {
            this.ctx.storage.sql.exec(body.sql, ...body.params)
          } else {
            this.ctx.storage.sql.exec(body.sql)
          }
          return Response.json({ ok: true })
        }

        return Response.json({ error: `unknown sql op: ${op}` }, { status: 400 })
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 })
      }
    }

    // --- KV endpoints (existing) ---
    const key = pathname

    if (method === "GET") {
      const value = await this.ctx.storage.get(key)
      return Response.json({ key, method, value })
    }

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      let value: unknown
      try {
        value = await request.json()
      } catch {
        return Response.json({ error: "json body required" }, { status: 400 })
      }

      await this.ctx.storage.put(key, value)
      return Response.json({ key, method, stored: true, value })
    }

    if (method === "DELETE") {
      await this.ctx.storage.delete(key)
      return Response.json({ key, method, deleted: true })
    }

    return Response.json({ error: "method not allowed" }, { status: 405 })
  }
}
