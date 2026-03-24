interface Env {
  LOADER: {
    get(
      id: string,
      cb: () => Promise<{
        compatibilityDate: string;
        mainModule: string;
        modules: Record<string, string>;
        env?: Record<string, unknown>;
        globalOutbound?: null;
      }>
    ): {
      getEntrypoint(name?: string): {
        fetch(req: Request | string): Promise<Response>;
      };
    };
  };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // UI
    if (req.method === "GET" && url.pathname === "/") {
      return new Response(UI, { headers: { "content-type": "text/html" } });
    }

    // Run code
    if (req.method === "POST" && url.pathname === "/run") {
      const { code } = (await req.json()) as { code: string };
      if (!code) return Response.json({ error: "no code" }, { status: 400 });

      const id = await hash(code);

      // Wrap user code in a worker module
      const wrapped = `
export default {
  async fetch(req, env) {
    try {
      const __result = await (async () => {
        ${code}
      })();
      return Response.json({ ok: true, result: __result ?? null });
    } catch (e) {
      return Response.json({ ok: false, error: e.message }, { status: 500 });
    }
  }
};
`;

      const worker = env.LOADER.get(id, async () => ({
        compatibilityDate: "2025-06-01",
        mainModule: "main.js",
        modules: { "main.js": wrapped },
        globalOutbound: null, // sandboxed — no network
      }));

      const res = await worker.getEntrypoint().fetch("http://x/");
      const body = await res.json();
      return Response.json(body);
    }

    return Response.json({ error: "not found" }, { status: 404 });
  },
};

async function hash(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

const UI = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>loader lab</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: monospace; background: #0a0a0a; color: #e0e0e0; padding: 2rem; }
  h1 { font-size: 1.2rem; margin-bottom: 1rem; color: #f90; }
  textarea { width: 100%; height: 200px; background: #111; color: #0f0; border: 1px solid #333;
    padding: 1rem; font-family: monospace; font-size: 14px; resize: vertical; }
  button { background: #f90; color: #000; border: none; padding: 0.5rem 1.5rem;
    font-family: monospace; font-weight: bold; cursor: pointer; margin-top: 0.5rem; }
  button:hover { background: #fa0; }
  pre { background: #111; border: 1px solid #333; padding: 1rem; margin-top: 1rem;
    white-space: pre-wrap; min-height: 60px; font-size: 13px; }
  .hint { color: #666; font-size: 12px; margin-top: 0.5rem; }
</style>
</head><body>
<h1>loader lab</h1>
<textarea id="code">// your code runs in a sandboxed isolate (no network)
// return a value and it shows up below

const now = new Date().toISOString();
return { hello: "from the isolate", ts: now };</textarea>
<button onclick="run()">run</button>
<p class="hint">sandboxed: globalOutbound = null. pure compute only.</p>
<pre id="out">// output</pre>
<script>
async function run() {
  const out = document.getElementById('out');
  const code = document.getElementById('code').value;
  out.textContent = 'running...';
  try {
    const r = await fetch('/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    out.textContent = JSON.stringify(await r.json(), null, 2);
  } catch (e) {
    out.textContent = 'error: ' + e.message;
  }
}
</script>
</body></html>`;
