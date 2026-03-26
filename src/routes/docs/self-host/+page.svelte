<script lang="ts">
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
  
  const requirements = [
    { name: 'Cloudflare Account', detail: 'Workers Paid plan ($5/month) for D1 and bindings' },
    { name: 'Node.js or Bun', detail: 'For running the deploy script' },
    { name: 'Git', detail: 'To clone the repository' },
  ];
  
  const resources = [
    { name: 'D1 Database', detail: 'SQLite database for trace storage', required: true },
    { name: 'R2 Bucket', detail: 'Object storage for large outputs', required: true },
    { name: 'KV Namespace', detail: 'Key-value for chain state', required: false },
    { name: 'Worker', detail: 'V8 isolate execution environment', required: true },
    { name: 'AI Binding', detail: 'Workers AI for generate mode', required: false },
  ];
  
  const steps = [
    {
      number: 1,
      title: 'Clone the Repository',
      code: 'git clone https://github.com/acoyfellow/lab.git\ncd lab',
      description: 'Get the latest source code'
    },
    {
      number: 2,
      title: 'Install Dependencies',
      code: 'bun install\n# or: npm install',
      description: 'Install all required packages'
    },
    {
      number: 3,
      title: 'Create API Token',
      code: '',
      description: 'Go to Cloudflare Dashboard → My Profile → API Tokens → Create Token. Use "Custom token" with:',
      list: [
        'Account: Cloudflare Pages:Edit',
        'Account: Workers Scripts:Edit', 
        'Zone: Workers Routes:Edit (if using custom domain)'
      ]
    },
    {
      number: 4,
      title: 'Deploy',
      code: 'export CLOUDFLARE_API_TOKEN=your-token\nbun run deploy',
      description: 'Creates all resources and deploys the Worker (takes 2-3 minutes)'
    },
    {
      number: 5,
      title: 'Configure Environment',
      code: 'echo "LAB_URL=https://lab.YOUR-SUBDOMAIN.workers.dev" >> .env',
      description: 'Set your deployed URL for local development'
    },
    {
      number: 6,
      title: 'Verify',
      code: 'curl https://lab.YOUR-SUBDOMAIN.workers.dev',
      description: 'Should return: {"ok":true,"version":"0.x.x"}'
    }
  ];
</script>

<SEO
  title="Self-Hosting — lab"
  description="Deploy Lab to your own Cloudflare account. Complete guide to infrastructure setup, configuration, and deployment."
  path="/docs/self-host"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-10">
  <header class="space-y-3">
    <h1 class="text-2xl font-semibold tracking-tight">Self-Hosting Guide</h1>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Deploy Lab to your own Cloudflare account. You control the infrastructure, data, and capabilities. 
      Perfect for production workloads and compliance requirements.
    </p>
  </header>

  <section class="space-y-4">
    <h2 class="text-lg font-semibold">Requirements</h2>
    <div class="rounded-(--radius) border border-(--border) overflow-hidden">
      <table class="w-full text-[0.8125rem]">
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

  <section class="space-y-4">
    <h2 class="text-lg font-semibold">Infrastructure Created</h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      The deploy script provisions these Cloudflare resources automatically:
    </p>
    <div class="rounded-(--radius) border border-(--border) overflow-hidden">
      <table class="w-full text-[0.8125rem]">
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
  </section>

  <section class="space-y-6">
    <h2 class="text-lg font-semibold">Deployment Steps</h2>
    
    {#each steps as step}
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <span class="w-8 h-8 rounded-full bg-(--accent) text-white flex items-center justify-center font-semibold text-sm">
            {step.number}
          </span>
          <h3 class="font-semibold text-(--text)">{step.title}</h3>
        </div>
        <p class="text-[0.8125rem] text-(--text-2) pl-11">{step.description}</p>
        {#if step.code}
          <pre class="text-[0.75rem] bg-(--code-bg) p-3 rounded-(--radius) font-mono overflow-x-auto ml-11">{step.code}</pre>
        {/if}
        {#if step.list}
          <ul class="text-[0.8125rem] text-(--text-2) list-disc pl-16 space-y-1">
            {#each step.list as item}
              <li>{item}</li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </section>

  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-3">
    <h2 class="font-semibold text-(--text)">Configuration Options</h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      After deployment, you can customize your Lab instance:
    </p>
    <ul class="text-[0.8125rem] text-(--text-2) list-disc pl-5 space-y-1">
      <li>Add custom capabilities in worker configuration</li>
      <li>Configure rate limiting and quotas</li>
      <li>Set up custom domains</li>
      <li>Enable additional Cloudflare features (Analytics, Logs)</li>
    </ul>
  </section>

  <section class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4 space-y-2">
    <h3 class="font-semibold text-(--text)">Need Help?</h3>
    <ul class="text-[0.8125rem] space-y-1">
      <li><a href="https://github.com/acoyfellow/lab/issues" class="text-(--accent) hover:underline">GitHub Issues</a> — report bugs or ask questions</li>
      <li><a href={paths.docs} class="text-(--accent) hover:underline">Documentation</a> — API reference and guides</li>
    </ul>
  </section>

  <div class="pt-4 border-t border-(--border)">
    <a href="/docs" class="text-[0.8125rem] text-(--accent) hover:underline">← Back to Documentation</a>
  </div>
</div>