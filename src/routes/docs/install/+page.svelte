<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'use-hosted', label: 'Use the hosted instance' },
    { id: 'self-host', label: 'Self-host on Cloudflare' },
    { id: 'next', label: 'Next steps' },
  ];
</script>

<DocsArticle
  pageTitle="Install"
  segment="Install"
  description="Two paths: use the hosted Lab instance, or deploy your own to Cloudflare."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight">Install</h1>
    <p class="leading-relaxed">
      You have two options. If you just want to call Lab from an agent, use the public hosted instance. If you want full control over the data and capabilities, deploy your own.
    </p>
  </header>

  <section id="use-hosted" class="space-y-4">
    <h2 class="text-lg font-semibold">Use the hosted instance</h2>
    <p class="leading-relaxed">
      The fastest path. Public instance at <code class="font-mono text-[0.8125rem]">lab.coey.dev</code>. No account, no token, best-effort.
    </p>

    <div>
      <p class="docs-section-label mb-2">Install the client</p>
      <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">npm install @acoyfellow/lab</pre>
    </div>

    <div>
      <p class="docs-section-label mb-2">Run code</p>
      <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">{`import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({ baseUrl: "https://lab.coey.dev" });

const r = await lab.runSandbox({ body: "return 40 + 2" });
console.log(r.result);    // 42
console.log(r.resultId);  // open at https://lab.coey.dev/results/<id>`}</pre>
    </div>

    <div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4">
      <p class="text-[0.8125rem] m-0 text-(--text-2)">
        Anyone with a receipt URL can read it. Don't put secrets in code or capabilities you wouldn't want public.
      </p>
    </div>
  </section>

  <section id="self-host" class="space-y-4">
    <h2 class="text-lg font-semibold">Self-host on Cloudflare</h2>
    <p class="leading-relaxed">
      For private use, set <code class="font-mono text-[0.8125rem]">LAB_AUTH_TOKEN</code> on the deployed worker; every request must then carry <code class="font-mono text-[0.8125rem]">Authorization: Bearer …</code>.
    </p>

    <div>
      <p class="docs-section-label mb-2">Quick path</p>
      <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">{`git clone https://github.com/acoyfellow/lab.git && cd lab
bun install
export CLOUDFLARE_API_TOKEN=your-token
bun run deploy`}</pre>
      <p class="text-[0.8125rem] text-(--text-3) mt-2">
        Alchemy provisions the public app, private Worker, KV, D1 (auth + engine), Worker Loader, Durable Objects, and optional R2/AI bindings. Takes ~2 minutes.
      </p>
    </div>

    <p class="leading-relaxed">
      Full requirements, Cloudflare token permissions, and configuration: <a href="/docs/self-host" class="text-(--accent) hover:underline">self-host guide</a>.
    </p>
  </section>

  <section id="next" class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-3">
    <h2 class="font-semibold text-(--text)">Next</h2>
    <ul class="space-y-2 text-[0.875rem]">
      <li><a href="/tutorial" class="text-(--accent) hover:underline">2-minute tutorial</a> — install, run, see the JSON</li>
      <li><a href="/docs/typescript" class="text-(--accent) hover:underline">TypeScript client reference</a></li>
      <li><a href="/docs/agent-integration" class="text-(--accent) hover:underline">Wire it up as an MCP server</a></li>
    </ul>
  </section>
</DocsArticle>
