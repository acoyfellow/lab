import { DurableObject } from "cloudflare:workers"

/**
 * Stateful Durable Object backing the `durableObjectFetch` capability.
 *
 * Guest code calls `labDo.fetch(name, { method, path, body })`.
 * `path` is treated as the storage key (pathname).
 */
export class LabStubDurableObject extends DurableObject {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const key = url.pathname.replace(/^\/+/, "") || "_"
    const method = request.method.toUpperCase()

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
