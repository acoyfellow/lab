import { parse } from "acorn"

/** Same wrapping as app tests: guest body runs inside an async IIFE. Returns an error message or null if ok. */
export function guestBodySyntaxError(body: string): string | null {
  const wrapped = `(async () => {\n${body}\n})()`
  try {
    parse(wrapped, { ecmaVersion: 2022, sourceType: "script" })
    return null
  } catch (e) {
    return e instanceof Error ? e.message : "syntax error"
  }
}
