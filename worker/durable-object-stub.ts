import { DurableObject } from "cloudflare:workers"

/**
 * Minimal Durable Object for the `durableObjectFetch` capability smoke path.
 * Guest code calls labDo.fetch(name, path); host forwards to this stub's /echo.
 */
export class LabStubDurableObject extends DurableObject {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const info = {
      path: url.pathname,
      method: request.method,
    }
    return Response.json({ ok: true, stub: "LabStubDurableObject", ...info })
  }
}
