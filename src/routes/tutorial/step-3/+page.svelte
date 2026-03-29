<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import TutorialPager from '$lib/tutorial/TutorialPager.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Step 3 · Agents and Handoffs — lab"
  description="Connect AI agents via MCP and use traces as handoff points between sessions."
  path="/tutorial/step-3"
  type="website"
/>

<header class="space-y-2">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Tutorial • Step 3 of 3
    </div>
    <h1 class="text-2xl font-semibold tracking-tight">Agents and Handoffs</h1>
    <p class="text-[0.9375rem] text-(--text-2)">
      Connect Lab to AI agents via MCP. Generate chain steps, run them, and share traces as handoff artifacts.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      1. Install
    </h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      2. Connect Your Agent
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Use the MCP server to let agents discover and execute Lab chains. Works with Claude Desktop, Cursor, or any MCP client.
    </p>
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
      <div class="text-[0.75rem] text-(--text-3) mb-2">Claude Desktop config:</div>
      <pre class="text-[0.75rem] bg-(--code-bg) p-3 rounded font-mono overflow-x-auto">&lbrace;
  "mcpServers": &lbrace;
    "lab": &lbrace;
      "type": "streamable-http",
      "url": "https://lab.YOUR-DOMAIN.workers.dev/mcp"
    &rbrace;
  &rbrace;
&rbrace;</pre>
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      3. Agent-Generated Chains
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Agents can generate chain steps dynamically based on the task. Then execute and trace the result.
    </p>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.labClient}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      4. Handoff with Traces
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Every run produces a traceId. Share it as a handoff artifact — other agents (or humans) can inspect, fork, and continue the work.
    </p>
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
      <div class="text-[0.75rem] text-(--text-3) mb-2">Fetch trace programmatically:</div>
      <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
        {@html data.codeHtml.fetchTrace}
      </div>
    </div>
  </section>

  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
    <h3 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Try It Locally
    </h3>
    <p class="text-[0.8125rem] text-(--text-2)">
      Run the included bridge script to see a real agent session generate and execute Lab chains:
    </p>
    <ol class="text-[0.8125rem] text-(--text-2) list-decimal pl-5 space-y-1">
      <li><code class="font-mono text-[0.7rem]">bun dev</code> (Worker on :1337) or set <code class="font-mono text-[0.7rem]">LAB_URL</code></li>
      <li><code class="font-mono text-[0.7rem]">bun run pi:lab-bridge</code> — runs Pi session → generates chain → executes → prints trace URL</li>
    </ol>
    <p class="text-[0.75rem] text-(--text-3) mt-2">
      Source: <a href="https://github.com/acoyfellow/lab/blob/main/scripts/pi-lab-bridge.ts" class="text-(--text) underline">scripts/pi-lab-bridge.ts</a>
    </p>
  </section>

  <section class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4 text-center space-y-3">
    <h3 class="font-semibold text-(--text)">Tutorial Complete!</h3>
    <p class="text-[0.8125rem] text-(--text-2)">
      You've learned: Install → Write → Run → Inspect → Chain → Agent Integration
    </p>
    <div class="flex flex-wrap gap-3 justify-center">
      <AppLink
        to="/compose"
        class="inline-flex items-center min-h-10 font-semibold text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--accent) text-white no-underline hover:bg-(--accent-hover)"
      >
        Open Compose
      </AppLink>
      <AppLink
        to="/examples"
        class="inline-flex items-center min-h-10 font-medium text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >
        Browse Examples
      </AppLink>
    </div>
  </section>

<TutorialPager prev={{ href: paths.tutorialStep2, label: 'Step 2 · Multi-Step Chains' }} />
