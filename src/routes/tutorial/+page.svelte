<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Tutorial — Lab"
  description="Install the client, run code in a sandbox, open the receipt URL. Two minutes."
  path="/tutorial"
  type="website"
/>

<header class="space-y-2">
  <h1 class="text-2xl font-semibold tracking-tight">2-minute tutorial</h1>
  <p class="leading-relaxed">
    Install, run, open the receipt. We'll use the public hosted instance — no signup.
  </p>
</header>

<!-- 1. Install -->
<section class="space-y-3">
  <h2 class="docs-section-label">1. Install</h2>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.install}
  </div>
</section>

<!-- 2. Run code -->
<section class="space-y-3">
  <h2 class="docs-section-label">2. Run code</h2>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.runFromAgent}
  </div>
  <details class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
    <summary class="px-4 py-2.5 cursor-pointer text-[0.8125rem] text-(--text-2) hover:text-(--text) select-none">
      Or with curl
    </summary>
    <div class="px-4 pb-3">
      <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
        {@html data.codeHtml.runCurl}
      </div>
    </div>
  </details>
</section>

<!-- 3. Open the receipt -->
<section class="space-y-3">
  <h2 class="docs-section-label">3. Open the receipt</h2>
  <p>
    Every run is saved. The response includes a <code class="font-mono text-[0.8125rem]">resultId</code>. Two URLs:
  </p>
  <ul class="list-disc pl-5 space-y-1 text-[0.875rem]">
    <li><code class="font-mono text-[0.8125rem]">/results/&#123;id&#125;</code> — open in a browser</li>
    <li><code class="font-mono text-[0.8125rem]">/results/&#123;id&#125;.json</code> — fetch from another agent</li>
  </ul>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.fetchResult}
  </div>
</section>

<!-- Optional: MCP -->
<section class="space-y-3">
  <h2 class="docs-section-label">Optional: wire up an MCP server</h2>
  <p>
    Drop Lab into Claude Desktop, Cursor, or any MCP client so your agent can call <code class="font-mono text-[0.8125rem]">execute</code> directly. Replace <code class="font-mono text-[0.8125rem]">$LAB_URL</code> with <code class="font-mono text-[0.8125rem]">https://lab.coey.dev</code> or your self-hosted origin.
  </p>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.mcpConfig}
  </div>
</section>

<!-- What's next -->
<section class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-5 space-y-3">
  <h3 class="font-semibold text-(--text)">That's it.</h3>
  <p>Three things you can do next:</p>
  <div class="flex flex-wrap gap-3">
    <AppLink
      to="/compose"
      class="inline-flex items-center min-h-10 font-semibold text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--accent) text-white no-underline hover:bg-(--accent-hover)"
    >
      Open Compose
    </AppLink>
    <AppLink
      to={paths.docsPatterns}
      class="inline-flex items-center min-h-10 font-medium text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
    >
      Browse patterns
    </AppLink>
    <AppLink
      to={paths.docsHttpApi}
      class="inline-flex items-center min-h-10 font-medium text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
    >
      HTTP API reference
    </AppLink>
  </div>
</section>
