<script lang="ts">
  import SEO from '$lib/SEO.svelte';

  let { data } = $props();
</script>

<SEO
  title="Sessions — lab"
  description="Agent sessions backed by Artifact repos and Lab receipt trails."
  path="/sessions"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-lg font-semibold tracking-tight">Sessions</h1>
    <p class="text-[0.875rem] text-(--text-2) max-w-[60ch] leading-relaxed">
      A session ties one repo (Cloudflare Artifact or local git) to the receipt trail an agent writes against it. Open one to see the goal, current state, next action, and every receipt the agent has produced.
    </p>
  </header>

  {#if data.sessions.length === 0}
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.875rem] text-(--text-2)">
      No sessions yet. Create one through the API or Lab MCP, then attach receipts as the agent works.
    </div>
  {:else}
    <div class="space-y-3">
      {#each data.sessions as session}
        <a href="/sessions/{session.id}" class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:border-(--accent)/40 transition-colors">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-semibold text-(--text)">{session.title}</div>
              <div class="text-[0.8125rem] text-(--text-2) mt-1">
                <code>{session.artifact.repo}</code>
                {#if session.artifact.head}
                  <span> @ <code>{session.artifact.head}</code></span>
                {/if}
              </div>
            </div>
            <span class="text-[0.6875rem] uppercase tracking-wider text-(--text-3)">{session.status}</span>
          </div>
          <div class="text-[0.75rem] text-(--text-3) mt-3">
            {session.receiptIds.length} receipt{session.receiptIds.length === 1 ? '' : 's'} · {session.updatedAt}
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
