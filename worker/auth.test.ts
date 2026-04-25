import { describe, test, expect } from "bun:test"
import { authGate, __test } from "./auth"

const { parseTokens, bearerFromHeader, isInternalCall, constantTimeEqual } = __test

function makeRequest(opts: {
  url?: string
  method?: string
  headers?: Record<string, string>
}): Request {
  return new Request(opts.url ?? "https://lab.example.com/run", {
    method: opts.method ?? "POST",
    headers: opts.headers,
  })
}

describe("parseTokens", () => {
  test("undefined → empty", () => {
    expect(parseTokens(undefined)).toEqual([])
  })

  test("empty string → empty", () => {
    expect(parseTokens("")).toEqual([])
    expect(parseTokens("   ")).toEqual([])
  })

  test("single token", () => {
    expect(parseTokens("abc123")).toEqual(["abc123"])
  })

  test("comma-separated, trims whitespace, drops empties", () => {
    expect(parseTokens("abc, def , ghi,, jkl ")).toEqual(["abc", "def", "ghi", "jkl"])
  })
})

describe("bearerFromHeader", () => {
  test("returns null when no header", () => {
    expect(bearerFromHeader(makeRequest({}))).toBeNull()
  })

  test("parses lowercase 'bearer'", () => {
    expect(bearerFromHeader(makeRequest({ headers: { authorization: "bearer xyz" } }))).toBe("xyz")
  })

  test("parses 'Bearer' (capital)", () => {
    expect(bearerFromHeader(makeRequest({ headers: { Authorization: "Bearer xyz" } }))).toBe("xyz")
  })

  test("trims surrounding whitespace", () => {
    expect(bearerFromHeader(makeRequest({ headers: { authorization: "  Bearer   xyz  " } }))).toBe("xyz")
  })

  test("returns null for non-bearer schemes", () => {
    expect(bearerFromHeader(makeRequest({ headers: { authorization: "Basic abc" } }))).toBeNull()
  })
})

describe("isInternalCall", () => {
  test("hostname=internal → true", () => {
    expect(isInternalCall(makeRequest({ url: "http://internal/invoke/r2" }))).toBe(true)
  })

  test("public hostname → false", () => {
    expect(isInternalCall(makeRequest({ url: "https://lab.coey.dev/invoke/r2" }))).toBe(false)
  })
})

describe("constantTimeEqual", () => {
  test("equal strings → true", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true)
  })

  test("different strings → false", () => {
    expect(constantTimeEqual("abc", "abd")).toBe(false)
  })

  test("different lengths → false", () => {
    expect(constantTimeEqual("abc", "abcd")).toBe(false)
  })

  test("empty strings equal", () => {
    expect(constantTimeEqual("", "")).toBe(true)
  })
})

describe("authGate — open mode (no tokens)", () => {
  test("undefined env → ok=true", () => {
    const r = authGate(makeRequest({}), { configuredTokens: undefined })
    expect(r.ok).toBe(true)
  })

  test("empty env → ok=true", () => {
    const r = authGate(makeRequest({}), { configuredTokens: "" })
    expect(r.ok).toBe(true)
  })

  test("all-whitespace env → ok=true", () => {
    const r = authGate(makeRequest({}), { configuredTokens: "  ,  " })
    expect(r.ok).toBe(true)
  })

  test("missing Authorization is fine in open mode", () => {
    const r = authGate(
      makeRequest({ url: "https://lab.example.com/run" }),
      { configuredTokens: undefined },
    )
    expect(r.ok).toBe(true)
  })
})

describe("authGate — locked mode (tokens configured)", () => {
  const tokens = "secret-a,secret-b"

  test("missing Authorization → 401", async () => {
    const r = authGate(makeRequest({}), { configuredTokens: tokens })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(401)
      expect(r.response.headers.get("WWW-Authenticate")).toContain("Bearer")
    }
  })

  test("wrong token → 401", async () => {
    const r = authGate(
      makeRequest({ headers: { authorization: "Bearer wrong" } }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.status).toBe(401)
      const body = (await r.response.json()) as { error: string }
      expect(body.error).toContain("invalid")
    }
  })

  test("correct token (first in list) → ok", () => {
    const r = authGate(
      makeRequest({ headers: { authorization: "Bearer secret-a" } }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(true)
  })

  test("correct token (second in list) → ok", () => {
    const r = authGate(
      makeRequest({ headers: { authorization: "Bearer secret-b" } }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(true)
  })

  test("/health is always open", () => {
    const r = authGate(
      makeRequest({ url: "https://lab.example.com/health", method: "GET" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(true)
  })

  test("/.well-known/* is always open", () => {
    const r = authGate(
      makeRequest({ url: "https://lab.example.com/.well-known/jwks.json", method: "GET" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(true)
  })

  test("/invoke/* from external caller → 401", () => {
    const r = authGate(
      makeRequest({ url: "https://lab.example.com/invoke/r2" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(401)
  })

  test("/invoke/* from internal caller → ok (no token needed)", () => {
    const r = authGate(
      makeRequest({ url: "http://internal/invoke/r2" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(true)
  })

  test("/spawn/child from internal caller → ok", () => {
    const r = authGate(
      makeRequest({ url: "http://internal/spawn/child" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(true)
  })

  test("/spawn/child from external caller → 401", () => {
    const r = authGate(
      makeRequest({ url: "https://lab.example.com/spawn/child" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(false)
  })

  test("/results/:id requires auth", () => {
    const r = authGate(
      makeRequest({ url: "https://lab.example.com/results/abc123.json", method: "GET" }),
      { configuredTokens: tokens },
    )
    expect(r.ok).toBe(false)
  })

  test("CORS headers are echoed in 401 response", async () => {
    const r = authGate(makeRequest({}), {
      configuredTokens: tokens,
      corsHeaders: {
        "Access-Control-Allow-Origin": "https://app.example.com",
      },
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.response.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example.com")
    }
  })
})
