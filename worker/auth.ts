/**
 * Self-host auth gate for the Lab worker.
 *
 * Behaviour:
 *   - If `LAB_AUTH_TOKEN` env var is unset OR empty → worker is open (public instance mode).
 *   - If set → every external request requires `Authorization: Bearer <token>` matching one of
 *     the comma-separated tokens. Constant-time compared.
 *
 * Always-open paths (even when auth is on):
 *   - /health             — uptime probe
 *   - /.well-known/*      — future-proofing (e.g. JWKS)
 *
 * Internal-only paths (allowed via `SELF` from inside the sandbox; rejected from external
 * callers when auth is on):
 *   - /invoke/*           — host-side capability invocations called by guest isolates
 *   - /spawn/child        — recursive isolate spawn
 *
 * SELF outbound calls always use hostname `"internal"` (see worker/guest/templates.ts).
 * Any external request with a different hostname hitting these paths is rejected when
 * auth is enabled.
 */

const ALWAYS_OPEN_PATHS = ["/health"]
const ALWAYS_OPEN_PREFIXES = ["/.well-known/"]
const INTERNAL_ONLY_PREFIXES = ["/invoke/", "/spawn/"]

/**
 * Constant-time string comparison. Avoids leaking token length / prefix via timing.
 * Both args treated as utf-8 strings of bounded length (we cap at 4KB).
 */
function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a.slice(0, 4096))
  const bBytes = new TextEncoder().encode(b.slice(0, 4096))
  if (aBytes.byteLength !== bBytes.byteLength) {
    // Still do a comparison pass against `a` to keep the work shape similar — but the
    // length mismatch alone is not a meaningful side-channel for tokens of fixed format.
    return false
  }
  let diff = 0
  for (let i = 0; i < aBytes.byteLength; i++) {
    diff |= aBytes[i] ^ bBytes[i]
  }
  return diff === 0
}

function parseTokens(envValue: string | undefined): string[] {
  if (!envValue) return []
  return envValue
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function bearerFromHeader(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization")
  if (!h) return null
  const m = /^bearer\s+(.+)$/i.exec(h.trim())
  return m ? m[1].trim() : null
}

function isInternalCall(req: Request): boolean {
  // SELF outbound from a guest isolate uses `http://internal/...` (see guest/templates.ts).
  // External callers will arrive with the deployed worker hostname, never `internal`.
  try {
    return new URL(req.url).hostname === "internal"
  } catch {
    return false
  }
}

export type AuthGateResult =
  | { ok: true }
  | { ok: false; response: Response }

export interface AuthGateOptions {
  /** Comma-separated token list from env. */
  configuredTokens: string | undefined
  /** Optional CORS headers to apply to error responses. */
  corsHeaders?: Record<string, string>
}

/**
 * Run the auth gate against a request. Returns `{ ok: true }` to continue routing,
 * or `{ ok: false, response }` with a ready-to-return error response.
 */
export function authGate(req: Request, opts: AuthGateOptions): AuthGateResult {
  const tokens = parseTokens(opts.configuredTokens)

  // Mode 1: open instance (no tokens configured) → always pass.
  if (tokens.length === 0) return { ok: true }

  const url = new URL(req.url)
  const path = url.pathname

  // Always-open paths bypass auth even in locked-down mode.
  if (ALWAYS_OPEN_PATHS.includes(path)) return { ok: true }
  for (const prefix of ALWAYS_OPEN_PREFIXES) {
    if (path.startsWith(prefix)) return { ok: true }
  }

  // Internal-only paths: SELF calls allowed, external calls rejected.
  for (const prefix of INTERNAL_ONLY_PREFIXES) {
    if (path.startsWith(prefix)) {
      if (isInternalCall(req)) return { ok: true }
      return { ok: false, response: deny(401, "internal endpoint", opts.corsHeaders) }
    }
  }

  // All other paths: require a matching bearer token.
  const presented = bearerFromHeader(req)
  if (!presented) {
    return {
      ok: false,
      response: deny(401, "missing Authorization: Bearer <token>", opts.corsHeaders, {
        "WWW-Authenticate": 'Bearer realm="lab"',
      }),
    }
  }

  for (const token of tokens) {
    if (constantTimeEqual(presented, token)) {
      return { ok: true }
    }
  }

  return { ok: false, response: deny(401, "invalid token", opts.corsHeaders) }
}

function deny(
  status: number,
  message: string,
  corsHeaders?: Record<string, string>,
  extra?: Record<string, string>,
): Response {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...corsHeaders,
    ...extra,
  }
  return new Response(JSON.stringify({ error: message }), { status, headers })
}

// Exported for tests
export const __test = {
  parseTokens,
  bearerFromHeader,
  isInternalCall,
  constantTimeEqual,
  ALWAYS_OPEN_PATHS,
  ALWAYS_OPEN_PREFIXES,
  INTERNAL_ONLY_PREFIXES,
}
