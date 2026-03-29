<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Tutorial — Lab"
  description="Install Lab, connect your agent, run code in a sandbox, and see the result."
  path="/tutorial"
  type="website"
/>

<header class="space-y-2">
  <h1 class="text-2xl font-semibold tracking-tight">Get started</h1>
  <p class="leading-relaxed">
    Install the client, connect an agent, run code, see the result. Takes about two minutes.
  </p>
</header>

<!-- 1. Install -->
<section class="space-y-3">
  <h2 class="docs-section-label">1. Install</h2>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.install}
  </div>
</section>

<!-- 2. Connect your agent -->
<section class="space-y-3">
  <h2 class="docs-section-label">2. Connect your agent</h2>
  <p>
    Add Lab as a stdio MCP server so your agent can run code and read saved results. Works with Claude Desktop, Cursor, or any MCP client.
  </p>
  <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
    <div class="docs-section-label mb-2">MCP config</div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.mcpConfig}
    </div>
  </div>
  <p class="text-[0.8125rem] text-(--text-3)">
    Replace <code class="font-mono text-[0.8125rem]">$LAB_URL</code> with your public app origin.
    Don't have one yet? <AppLink to={paths.docsSelfHost} class="text-(--accent) hover:underline">Self-host guide →</AppLink>
  </p>
</section>

<!-- 3. Run code -->
<section class="space-y-3">
  <h2 class="docs-section-label">3. Run code</h2>
  <p>
    Send code to Lab. It runs in a Cloudflare Worker sandbox and returns the result plus a persisted <code class="font-mono text-[0.8125rem]">resultId</code>.
  </p>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.runFromAgent}
  </div>

  <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
    <div class="docs-section-label">Or with curl</div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.runCurl}
    </div>
  </div>
</section>

<!-- 4. See the result -->
<section class="space-y-3">
  <h2 class="docs-section-label">4. See the result</h2>
  <p>
    Every run saves a JSON result. Agents should read <code class="font-mono text-[0.8125rem]">/results/&#123;id&#125;.json</code>. Humans can open <code class="font-mono text-[0.8125rem]">/results/&#123;id&#125;</code> in the viewer. Successful runs include full step data. Failed or aborted runs include the error and reason; per-step detail may be partial.
  </p>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.fetchResult}
  </div>
</section>

<!-- What's next -->
<section class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-5 space-y-3">
  <h3 class="font-semibold text-(--text)">That's it.</h3>
  <p>Install, connect, run, see the result. Here's where to go next:</p>
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
