<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'what-gets-created', label: 'What Gets Created' },
    { id: 'step-by-step', label: 'Step-by-Step' },
    { id: 'commands', label: 'Commands' },
    { id: 'next-steps', label: 'Next Steps' },
  ];

  const steps = [
    {
      number: 1,
      title: 'Prerequisites',
      content:
        'Cloudflare account with Workers Paid plan (required for D1 and some bindings). Bun or Node.js installed locally.',
    },
    {
      number: 2,
      title: 'Clone and Install',
      content: 'Clone the repository and install dependencies.',
    },
    {
      number: 3,
      title: 'Authentication',
      content: 'Get your Cloudflare API token. See the permissions list below.',
    },
    {
      number: 4,
      title: 'Deploy',
      content:
        'Run the deploy command. Alchemy creates D1 databases, R2 buckets, and KV namespaces automatically.',
    },
    {
      number: 5,
      title: 'Environment Variables',
      content: 'Set up your LAB_URL and any API keys for external services.',
    },
    {
      number: 6,
      title: 'Verify',
      content: 'Test your deployment with a simple curl command.',
    },
  ];

  const infrastructure = [
    { name: 'D1 Database', purpose: 'Auth sessions and user accounts (Better Auth)', required: true },
    { name: 'KV Namespace', purpose: 'Saved results (traces) and guest KV read data', required: true },
    { name: 'Worker', purpose: 'Sandbox execution environment', required: true },
    { name: 'R2 Bucket', purpose: 'Guest file storage (r2Read capability)', required: false },
    { name: 'AI Binding', purpose: 'Workers AI for generate mode', required: false },
  ];
</script>

<DocsArticle
  pageTitle="Installation"
  segment="Installation"
  description="Step-by-step guide to deploying Lab to your Cloudflare account."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight">Installation</h1>
    <p class="leading-relaxed">
      Deploy Lab to your own Cloudflare account. You control the data, infrastructure, and capabilities.
    </p>
  </header>

  <section id="what-gets-created" class="space-y-4">
    <h2 class="text-lg font-semibold">What Gets Created</h2>
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
          {#each infrastructure as item}
            <tr class="bg-(--surface)">
              <td class="px-4 py-2.5 font-medium text-(--text)">{item.name}</td>
              <td class="px-4 py-2.5 text-(--text-2)">{item.purpose}</td>
              <td class="px-4 py-2.5">
                {#if item.required}
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
  </section>

  <section id="step-by-step" class="space-y-6">
    <h2 class="text-lg font-semibold">Step-by-Step</h2>

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
        <p class="pl-11">{step.content}</p>
      </div>
    {/each}
  </section>

  <section id="commands" class="space-y-4">
    <h2 class="text-lg font-semibold">Commands</h2>

    <div class="space-y-4">
      <div>
        <p class="docs-section-label mb-2">
          Clone and install
        </p>
        <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">git clone https://github.com/acoyfellow/lab
cd lab

bun install
npm install</pre>
      </div>

      <div>
        <p class="docs-section-label mb-2">Create API token</p>
        <p class="mb-2">
          Go to Cloudflare dashboard → My Profile → API Tokens → Create Token. Use the "Custom token" template with
          these permissions:
        </p>
        <ul class="list-disc pl-5 space-y-1 mb-3">
          <li>Account: Workers Scripts:Edit</li>
          <li>Account: Cloudflare Pages:Edit</li>
          <li>Zone: Workers Routes:Edit (optional — only if using a custom domain)</li>
        </ul>
      </div>

      <div>
        <p class="docs-section-label mb-2">Deploy</p>
        <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">export CLOUDFLARE_API_TOKEN=your-token-here
bun run deploy</pre>
        <p class="text-(--text-3) mt-2">
          This creates all infrastructure and deploys the Worker. Takes 2-3 minutes.
        </p>
      </div>

      <div>
        <p class="docs-section-label mb-2">
          Set environment variables
        </p>
        <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">echo 'LAB_URL=https://lab.YOUR-SUBDOMAIN.workers.dev' >> .env</pre>
      </div>

      <div>
        <p class="docs-section-label mb-2">Verify</p>
        <pre class="docs-pre bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto">curl https://lab.YOUR-SUBDOMAIN.workers.dev</pre>
        <p class="text-(--text-3) mt-2">
          Should return: <code class="font-mono text-[0.8125rem]">{'{"ok":true,"version":"0.x.x"}'}</code>
        </p>
      </div>
    </div>
  </section>

  <section id="next-steps" class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-3">
    <h2 class="font-semibold text-(--text)">Next Steps</h2>
    <ul class="space-y-2">
      <li class="flex items-center gap-2">
        <span class="text-(--accent)">→</span>
        <a href="/tutorial" class="text-(--accent) hover:underline">Complete the tutorial</a>
      </li>
      <li class="flex items-center gap-2">
        <span class="text-(--accent)">→</span>
        <a href="/docs/typescript" class="text-(--accent) hover:underline">Set up the TypeScript client</a>
      </li>
      <li class="flex items-center gap-2">
        <span class="text-(--accent)">→</span>
        <a href="/docs/capabilities" class="text-(--accent) hover:underline">Configure capabilities</a>
      </li>
    </ul>
  </section>
</DocsArticle>
