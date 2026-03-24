import { Effect, Exit, Cause } from "effect"
import { Isolate, IsolateError, makeIsolateLive, type WorkerLoaderBinding } from "./Loader"

interface Env {
  LOADER: WorkerLoaderBinding
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === "GET" && url.pathname === "/") {
      return new Response(UI, { headers: { "content-type": "text/html" } })
    }

    if (req.method === "POST" && url.pathname === "/run") {
      const { code } = (await req.json()) as { code: string }
      if (!code) return Response.json({ error: "no code" }, { status: 400 })

      // Build the program
      const program = Effect.gen(function* () {
        const isolate = yield* Isolate
        return yield* isolate.run(code)
      })

      // Provide the live Loader layer and run
      const layer = makeIsolateLive(env.LOADER)
      const exit = await Effect.runPromiseExit(
        program.pipe(Effect.provide(layer))
      )

      return Exit.match(exit, {
        onFailure: (cause) => {
          const failure = Cause.failureOption(cause)
          if (failure._tag === "Some" && failure.value instanceof IsolateError) {
            return Response.json(
              { ok: false, reason: failure.value.reason, error: failure.value.message },
              { status: 500 }
            )
          }
          return Response.json(
            { ok: false, error: Cause.pretty(cause) },
            { status: 500 }
          )
        },
        onSuccess: (result) => Response.json({ ok: true, result }),
      })
    }

    return Response.json({ error: "not found" }, { status: 404 })
  },
}

const UI = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>lab</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 2rem; }
  h1 { font-size: 1.2rem; margin-bottom: 0.25rem; color: #f90; }
  p.sub { color: #666; font-size: 12px; margin-bottom: 1rem; }
  textarea { width: 100%; height: 200px; background: #111; color: #0f0; border: 1px solid #333;
    padding: 1rem; font-family: monospace; font-size: 14px; resize: vertical; }
  button { background: #f90; color: #000; border: none; padding: 0.5rem 1.5rem;
    font-family: monospace; font-weight: bold; cursor: pointer; margin-top: 0.5rem; }
  button:hover { background: #fa0; }
  pre { background: #111; border: 1px solid #333; padding: 1rem; margin-top: 1rem;
    white-space: pre-wrap; min-height: 60px; font-size: 13px; }
  .meta { color: #666; font-size: 11px; margin-top: 0.5rem; }
</style>
</head><body>
<h1>lab</h1>
<p class="sub">Effect + Worker Loaders. Code runs in a sandboxed isolate. No network.</p>
<textarea id="code">// runs in a fresh V8 isolate via Effect -> Loader
// return a value to see it below

const nums = [1, 2, 3, 4, 5];
const sum = nums.reduce((a, b) => a + b, 0);
return { sum, mean: sum / nums.length, ts: new Date().toISOString() };</textarea>
<button onclick="run()">run</button>
<pre id="out">// output</pre>
<p class="meta">phase 1: Isolate service backed by Worker Loader. globalOutbound = null.</p>
<script>
async function run() {
  const out = document.getElementById('out');
  const code = document.getElementById('code').value;
  out.textContent = 'running...';
  const t0 = performance.now();
  try {
    const r = await fetch('/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const ms = (performance.now() - t0).toFixed(1);
    const json = await r.json();
    out.textContent = JSON.stringify(json, null, 2) + '\\n\\n// ' + ms + 'ms';
  } catch (e) {
    out.textContent = 'error: ' + e.message;
  }
}
</script>
</body></html>`
