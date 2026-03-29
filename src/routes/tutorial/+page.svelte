<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
</script>

<SEO
  title="Tutorial — lab"
  description="Learn Lab step by step. Install the client, run your first chain, and understand traces."
  path="/tutorial"
  type="website"
/>

<header class="space-y-2">
  <h1 class="text-2xl font-semibold tracking-tight">Tutorial</h1>
  <p class="text-[0.9375rem] text-(--text-2)">
    Install the client, chain some isolates, read a trace. Takes about five minutes.
  </p>
</header>

<div class="space-y-4">
  <a
    href={paths.tutorialStep1}
    class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
  >
    <div class="flex items-start gap-4">
      <div
        class="shrink-0 w-10 h-10 rounded-full bg-(--accent) text-white flex items-center justify-center font-semibold"
      >
        1
      </div>
      <div class="flex-1">
        <h2 class="font-semibold text-(--text) group-hover:text-(--accent) mb-1">Install and first run</h2>
        <p class="text-[0.8125rem] text-(--text-2)">
          Install the client, run a chain, get your first trace URL.
        </p>
      </div>
    </div>
  </a>

  <a
    href={paths.tutorialStep2}
    class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
  >
    <div class="flex items-start gap-4">
      <div
        class="shrink-0 w-10 h-10 rounded-full bg-(--surface-alt) border border-(--border) text-(--text-2) flex items-center justify-center font-semibold"
      >
        2
      </div>
      <div class="flex-1">
        <h2 class="font-semibold text-(--text) group-hover:text-(--accent) mb-1">Chains and capabilities</h2>
        <p class="text-[0.8125rem] text-(--text-2)">
          Pass data between steps, grant capabilities, read the trace.
        </p>
      </div>
    </div>
  </a>

  <a
    href={paths.tutorialStep3}
    class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
  >
    <div class="flex items-start gap-4">
      <div
        class="shrink-0 w-10 h-10 rounded-full bg-(--surface-alt) border border-(--border) text-(--text-2) flex items-center justify-center font-semibold"
      >
        3
      </div>
      <div class="flex-1">
        <h2 class="font-semibold text-(--text) group-hover:text-(--accent) mb-1">Agents and MCP</h2>
        <p class="text-[0.8125rem] text-(--text-2)">
          Connect AI agents via MCP, use traces as handoff artifacts.
        </p>
      </div>
    </div>
  </a>
</div>

<div class="pt-8 border-t border-(--border)">
  <div class="flex flex-wrap gap-3">
    <AppLink
      to={paths.tutorialStep1}
      class="inline-flex items-center min-h-10 font-semibold text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--accent) text-white no-underline hover:bg-(--accent-hover)"
    >
      Start Step 1
    </AppLink>
    <a
      href="/compose"
      class="inline-flex items-center min-h-10 font-medium text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
    >
      Skip to Compose
    </a>
  </div>
</div>
