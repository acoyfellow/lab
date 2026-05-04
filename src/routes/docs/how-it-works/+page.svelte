<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'isolates', label: 'Isolates' },
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'receipts', label: 'Receipts' },
    { id: 'chains', label: 'Chains' },
    { id: 'spawn', label: 'Spawn' },
    { id: 'generate', label: 'Generate' },
  ];
</script>

<DocsArticle
  pageTitle="Execution model"
  segment="How it works"
  description="Lab in five concepts: isolates, capabilities, receipts, chains, spawn."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight">Execution model</h1>
    <p class="leading-relaxed">
      Lab is a hosted JavaScript sandbox. You send code, it runs in a fresh V8 isolate on Cloudflare's edge, and you get back a result plus a permalink to the receipt. Five concepts cover everything.
    </p>
  </header>

  <section id="isolates" class="space-y-3">
    <h2 class="text-lg font-semibold text-(--text)">1. Isolates</h2>
    <p class="leading-relaxed">
      Every <code class="font-mono text-[0.8125rem]">/run</code> request gets a brand-new V8 isolate. No shared globals, no cross-request state, no cold starts that matter. The isolate is created via Cloudflare Worker Loaders, your code runs, the isolate is destroyed.
    </p>
    <p class="leading-relaxed text-(--text-2) text-[0.875rem]">
      Practically: <code class="font-mono text-[0.8125rem]">return 1 + 1</code> resolves in single-digit milliseconds and the result lands in your receipt.
    </p>
  </section>

  <section id="capabilities" class="space-y-3">
    <h2 class="text-lg font-semibold text-(--text)">2. Capabilities</h2>
    <p class="leading-relaxed">
      Code in an isolate has no host access by default. To touch KV, R2, D1, Workers AI, or to spawn a child isolate, you grant a capability on the request:
    </p>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono text-[0.8125rem] overflow-x-auto">{`{
  "body": "return await kv.get('user:1')",
  "capabilities": ["kvRead"]
}`}</pre>
    <p class="leading-relaxed">
      Without <code class="font-mono text-[0.8125rem]">kvRead</code>, calling <code class="font-mono text-[0.8125rem]">kv.get</code> throws. The denial is recorded in the receipt with a clear reason. See <a href="/docs/capabilities" class="text-(--accent) hover:underline">capabilities reference</a> for the full list.
    </p>
  </section>

  <section id="receipts" class="space-y-3">
    <h2 class="text-lg font-semibold text-(--text)">3. Receipts</h2>
    <p class="leading-relaxed">
      Every run is saved. The response includes a <code class="font-mono text-[0.8125rem]">resultId</code>:
    </p>
    <ul class="list-disc pl-5 space-y-1 text-[0.875rem]">
      <li><code class="font-mono text-[0.8125rem]">/results/:id</code> — viewer for humans</li>
      <li><code class="font-mono text-[0.8125rem]">/results/:id.json</code> — canonical JSON for agents</li>
    </ul>
    <p class="leading-relaxed">
      Successful runs include the code, the granted capabilities, the per-step input and output, and timing. Failed runs include the error and reason; per-step detail may be partial. See <a href="/docs/result-schema" class="text-(--accent) hover:underline">receipt schema</a>.
    </p>
  </section>

  <section id="chains" class="space-y-3">
    <h2 class="text-lg font-semibold text-(--text)">4. Chains</h2>
    <p class="leading-relaxed">
      A chain runs multiple steps in order. Each step is a fresh isolate. The previous step's return value is the next step's <code class="font-mono text-[0.8125rem]">input</code>:
    </p>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono text-[0.8125rem] overflow-x-auto">{`POST /run/chain
{
  "steps": [
    { "name": "fetch", "body": "return [1, 2, 3]",       "capabilities": [] },
    { "name": "sum",   "body": "return input.reduce((a,b) => a+b, 0)" }
  ]
}`}</pre>
    <p class="leading-relaxed">
      Each step has its own capability set. The receipt shows every step.
    </p>
  </section>

  <section id="spawn" class="space-y-3">
    <h2 class="text-lg font-semibold text-(--text)">5. Spawn</h2>
    <p class="leading-relaxed">
      With the <code class="font-mono text-[0.8125rem]">spawn</code> capability, code can launch child isolates from inside a parent isolate. Useful for fan-out: 50 parallel workers, then aggregate.
    </p>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono text-[0.8125rem] overflow-x-auto">{`const a = await spawn("return 10 * 10", []);
const b = await spawn("return 20 * 20", []);
return { a, b };`}</pre>
    <p class="leading-relaxed text-(--text-2) text-[0.875rem]">
      Child isolates only get the capabilities you pass to them. Depth is bounded by a per-request budget. Today the receipt records the top-level outcome and timing; per-child details aren't persisted.
    </p>
  </section>

  <section id="generate" class="space-y-3">
    <h2 class="text-lg font-semibold text-(--text)">Bonus: Generate</h2>
    <p class="leading-relaxed">
      <code class="font-mono text-[0.8125rem]">/run/generate</code> takes a prompt, asks Workers AI to write the JavaScript, then runs it in an isolate with whatever capabilities you grant. The receipt saves both the prompt and the generated code.
    </p>
  </section>
</DocsArticle>
