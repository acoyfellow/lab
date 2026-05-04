<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';
  import { version as appVersion } from '$app/environment';
  import { paths } from '$lib/paths';

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'requirements', label: 'Requirements' },
    { id: 'infrastructure-created', label: 'Infrastructure Created' },
    { id: 'deployment-steps', label: 'Deployment Steps' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'configuration', label: 'Configuration Options' },
    { id: 'need-help', label: 'Need Help?' },
  ];

  const requirements = [
    { name: 'Cloudflare Account', detail: 'Workers Paid plan for the required bindings' },
    { name: 'Node.js or Bun', detail: 'For running the deploy script' },
    { name: 'Git', detail: 'To clone the repository' },
  ];

  const resources = [
    { name: 'Public App', detail: 'Public origin for docs, receipt viewer, and HTTP API proxy routes', required: true },
    { name: 'Private Worker', detail: 'Sandbox execution engine and internal invoke routes', required: true },
    { name: 'Auth D1 Database', detail: 'Auth sessions and user accounts (Better Auth)', required: true },
    { name: 'Engine D1 Database', detail: 'Guest-readable D1 for d1Read demos and tests', required: true },
    { name: 'KV Namespace', detail: 'Receipts and guest KV read data', required: true },
    { name: 'Worker Loader', detail: 'Creates guest isolates at runtime', required: true },
    { name: 'Durable Objects', detail: 'Lab stub DO and Petri dish backing state', required: true },
    { name: 'R2 Bucket', detail: 'Optional guest file storage for r2Read', required: false },
    { name: 'AI Binding', detail: 'Optional Workers AI for generate mode', required: false },
  ];

  const steps = [
    {
      number: 1,
      title: 'Clone the Repository',
      code: 'git clone https://github.com/acoyfellow/lab.git\ncd lab',
      description: 'Get the latest source code',
    },
    {
      number: 2,
      title: 'Install Dependencies',
      code: 'bun install\n# or: npm install',
      description: 'Install all required packages',
    },
    {
      number: 3,
      title: 'Create API Token',
      code: '',
      description:
        'Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token. Use "Custom token" with:',
      list: [
        'Account: Cloudflare Pages:Edit',
        'Account: Workers Scripts:Edit',
        'Zone: Workers Routes:Edit (if using custom domain)',
      ],
    },
    {
      number: 4,
      title: 'Deploy',
      code: 'export CLOUDFLARE_API_TOKEN=your-token\nbun run deploy',
      description: 'Creates the public app, private Worker, and required backing bindings (takes 2-3 minutes)',
    },
    {
      number: 5,
      title: 'Configure Environment',
      code: 'echo "LAB_URL=https://YOUR-LAB-APP-URL" >> .env',
      description: 'Set your public app origin for local development and clients',
    },
    {
      number: 6,
      title: 'Verify',
      code: 'curl $LAB_URL/health\ncurl -s $LAB_URL/lab/catalog | jq \'.version\'',
      description: `Should return: {"ok":true} and then "${appVersion}"`,
    },
  ];
</script>

<DocsArticle
  pageTitle="Self-Hosting"
  segment="Self-Hosting"
  description="Deploy Lab to your own Cloudflare account. Infrastructure setup, configuration, and deployment."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight">Self-Hosting Guide</h1>
    <p class="leading-relaxed">
      Deploy Lab to your own Cloudflare account. You control the deployment, bindings, and capability configuration.
    </p>
  </header>

  <section id="requirements" class="space-y-4">
    <h2 class="text-lg font-semibold">Requirements</h2>
    <div class="rounded-(--radius) border border-(--border) overflow-hidden">
      <table class="w-full text-[0.875rem]">
        <tbody class="divide-y divide-(--border)">
          {#each requirements as req}
            <tr class="bg-(--surface)">
              <td class="px-4 py-3 font-medium text-(--text)">{req.name}</td>
              <td class="px-4 py-3 text-(--text-2)">{req.detail}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section id="infrastructure-created" class="space-y-4">
    <h2 class="text-lg font-semibold">Infrastructure Created</h2>
    <p>
      The deploy script provisions these Cloudflare resources automatically:
    </p>
    <div class="rounded-(--radius) border border-(--border) overflow-hidden">
      <table class="w-full text-[0.875rem]">
        <thead class="bg-(--surface-alt)">
          <tr>
            <th class="text-left px-4 py-2 font-semibold text-(--text-3)">Resource</th>
            <th class="text-left px-4 py-2 font-semibold text-(--text-3)">Purpose</th>
            <th class="text-left px-4 py-2 font-semibold text-(--text-3)">Required</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--border)">
          {#each resources as resource}
            <tr class="bg-(--surface)">
              <td class="px-4 py-2.5 font-medium text-(--text)">{resource.name}</td>
              <td class="px-4 py-2.5 text-(--text-2)">{resource.detail}</td>
              <td class="px-4 py-2.5">
                {#if resource.required}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">Required</span>
                {:else}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-(--surface-alt) text-(--text-3)">Optional</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="mt-4 space-y-2 text-[0.875rem] leading-relaxed">
      <p class="font-semibold text-(--text) m-0">Default bindings</p>
      <ul class="list-disc pl-5 space-y-1 m-0 text-(--text-2)">
        <li><strong class="text-(--text)">APP</strong>: public app origin and HTTP API proxy</li>
        <li><strong class="text-(--text)">WORKER</strong>: private sandbox engine with invoke routes</li>
        <li><strong class="text-(--text)">DB</strong>: Better Auth data</li>
        <li><strong class="text-(--text)">ENGINE_D1</strong>: guest-readable D1 for <code class="font-mono text-[0.8125rem]">d1Read</code></li>
        <li><strong class="text-(--text)">KV</strong>: receipts and guest KV read data</li>
        <li><strong class="text-(--text)">LAB_DO / PETRI_DO</strong>: durable backing state</li>
        <li><strong class="text-(--text)">R2 / Workers AI</strong>: optional feature bindings</li>
      </ul>
      <p class="text-(--text-3) m-0 mt-2">
        Same summary on <a href="/docs/install#what-gets-created" class="text-(--accent) hover:underline">Installation → What gets created</a>.
      </p>
    </div>
  </section>

  <section id="deployment-steps" class="space-y-6">
    <h2 class="text-lg font-semibold">Deployment Steps</h2>

    {#each steps as step}
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <span
            class="w-8 h-8 rounded-full bg-(--accent) text-white flex items-center justify-center font-semibold text-sm"
          >
            {step.number}
          </span>
          <h3 class="font-semibold text-(--text)">{step.title}</h3>
        </div>
        <p class="pl-11">{step.description}</p>
        {#if step.code}
          <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto ml-11">{step.code}</pre>
        {/if}
        {#if step.list}
          <ul class="list-disc pl-16 space-y-1">
            {#each step.list as item}
              <li>{item}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </section>

  <section id="authentication" class="space-y-4">
    <h2 class="text-lg font-semibold">Authentication</h2>
    <p class="text-[0.9375rem] leading-relaxed">
      By default, a self-hosted Lab worker is open — anyone who knows the URL can run code and read receipts. To lock it down, set the <code class="font-mono text-[0.8125rem]">LAB_AUTH_TOKEN</code> environment variable on the worker. Every external request will then require <code class="font-mono text-[0.8125rem]">Authorization: Bearer &lt;token&gt;</code>.
    </p>

    <h3 class="font-semibold text-(--text)">1. Generate a token and set it on the worker</h3>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto"># pick any opaque secret (32+ random bytes recommended)
TOKEN=$(openssl rand -hex 32)

# put it in the deployed worker's secrets
bunx wrangler secret put LAB_AUTH_TOKEN --name lab-worker
# (paste $TOKEN when prompted)</pre>

    <h3 class="font-semibold text-(--text)">2. Send it from the SDK</h3>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">{`import { createLabClient } from "@acoyfellow/lab";

const lab = createLabClient({
  baseUrl: "https://your-instance.example",
  token: process.env.LAB_TOKEN,   // ← attaches Authorization on every call
});`}</pre>

    <h3 class="font-semibold text-(--text)">3. Send it from the MCP server</h3>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">{`{
  "mcpServers": {
    "lab": {
      "command": "npx",
      "args": ["-y", "@acoyfellow/lab-mcp"],
      "env": {
        "LAB_URL":   "https://your-instance.example",
        "LAB_TOKEN": "..."
      }
    }
  }
}`}</pre>

    <h3 class="font-semibold text-(--text)">4. Send it with curl</h3>
    <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">{`curl -X POST https://your-instance.example/run \\
  -H "Authorization: Bearer $LAB_TOKEN" \\
  -H 'content-type: application/json' \\
  -d '{ "body": "return 1+1", "capabilities": [] }'`}</pre>

    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2 text-[0.875rem]">
      <p class="font-semibold text-(--text) m-0">Behaviour notes</p>
      <ul class="list-disc pl-5 space-y-1 m-0 text-(--text-2)">
        <li><code class="font-mono text-[0.8125rem]">LAB_AUTH_TOKEN</code> can be a single token or a comma-separated list (<code class="font-mono text-[0.8125rem]">tok-a,tok-b</code>) — useful for rotation.</li>
        <li>Tokens are constant-time compared. <code class="font-mono text-[0.8125rem]">/health</code> and <code class="font-mono text-[0.8125rem]">/.well-known/*</code> stay open.</li>
        <li><code class="font-mono text-[0.8125rem]">/results/:id</code> and <code class="font-mono text-[0.8125rem]">/results/:id.json</code> are gated, so receipt URLs aren't reachable without the token.</li>
        <li>Internal sandbox-to-host calls (<code class="font-mono text-[0.8125rem]">/invoke/*</code>, <code class="font-mono text-[0.8125rem]">/spawn/child</code>) bypass auth — they're identified by the <code class="font-mono text-[0.8125rem]">internal</code> hostname used by <code class="font-mono text-[0.8125rem]">SELF</code> outbound calls and aren't reachable from external callers.</li>
        <li>When auth is on, <code class="font-mono text-[0.8125rem]">Access-Control-Allow-Origin: *</code> is dropped. Set <code class="font-mono text-[0.8125rem]">LAB_CORS_ORIGIN</code> to allow specific browser origins (or <code class="font-mono text-[0.8125rem]">*</code> if you accept the risk).</li>
      </ul>
    </div>
  </section>

  <section id="configuration" class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-3">
    <h2 class="font-semibold text-(--text)">Configuration Options</h2>
    <p>After deployment, you can customize your Lab instance:</p>
    <ul class="list-disc pl-5 space-y-1">
      <li>Add custom capabilities in worker configuration</li>
      <li>Configure rate limiting and quotas</li>
      <li>Set up custom domains</li>
      <li>Enable additional Cloudflare features (Analytics, Logs)</li>
    </ul>
  </section>

  <section id="need-help" class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4 space-y-2">
    <h3 class="font-semibold text-(--text)">Need Help?</h3>
    <ul class="space-y-1">
      <li>
        <a href="https://github.com/acoyfellow/lab/issues" class="text-(--accent) hover:underline">GitHub Issues</a>
        — report bugs or ask questions
      </li>
      <li>
        <a href={paths.docs} class="text-(--accent) hover:underline">Documentation</a> — API reference and guides
      </li>
    </ul>
  </section>
</DocsArticle>
