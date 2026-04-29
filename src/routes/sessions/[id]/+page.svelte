<script lang="ts">
  import SEO from '$lib/SEO.svelte';

  let { data } = $props();
  const session = $derived(data.session);
</script>

<SEO
  title={`${session.title} — lab session`}
  description="Artifact-backed agent session with a Lab receipt trail."
  path="/sessions/{session.id}"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  <header class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold tracking-tight m-0">{session.title}</h1>
        <p class="text-[0.8125rem] text-(--text-2) mt-1 mb-0">Session <code>{session.id}</code></p>
      </div>
      <span class="rounded-full border border-(--border) bg-(--surface) px-2.5 py-1 text-[0.6875rem] uppercase tracking-wider text-(--text-3)">
        {session.status}
      </span>
    </div>

    <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem]">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Artifact worktree</div>
      <div class="grid gap-2 sm:grid-cols-2">
        <div><span class="text-(--text-3)">Repo</span> <code>{session.artifact.repo}</code></div>
        <div><span class="text-(--text-3)">Branch</span> <code>{session.artifact.branch ?? 'main'}</code></div>
        {#if session.artifact.head}
          <div><span class="text-(--text-3)">Head</span> <code>{session.artifact.head}</code></div>
        {/if}
        {#if session.artifact.remote}
          <div><span class="text-(--text-3)">Remote</span> <code>{session.artifact.remote}</code></div>
        {/if}
      </div>
    </section>

    <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem]">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Continue from here</div>
        {#if session.summary?.updatedAt}
          <div class="text-[0.6875rem] text-(--text-3)">Updated {session.summary.updatedAt}</div>
        {/if}
      </div>

      {#if session.summary}
        <div class="mt-3 grid gap-3">
          {#if session.summary.goal}
            <div>
              <div class="text-(--text-3)">Goal</div>
              <div class="mt-1 text-(--text)">{session.summary.goal}</div>
            </div>
          {/if}
          {#if session.summary.state}
            <div>
              <div class="text-(--text-3)">State</div>
              <div class="mt-1 text-(--text)">{session.summary.state}</div>
            </div>
          {/if}
          {#if session.summary.nextAction}
            <div>
              <div class="text-(--text-3)">Next action</div>
              <div class="mt-1 text-(--text)">{session.summary.nextAction}</div>
            </div>
          {/if}
          {#if session.summary.risks?.length}
            <div>
              <div class="text-(--text-3)">Open risks</div>
              <ul class="mt-1 mb-0 pl-4 text-(--text)">
                {#each session.summary.risks as risk}
                  <li>{risk}</li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if session.summary.importantReceiptIds?.length}
            <div>
              <div class="text-(--text-3)">Important receipts</div>
              <div class="mt-1 flex flex-wrap gap-2">
                {#each session.summary.importantReceiptIds as id}
                  <a href="/receipts/{id}" class="text-(--accent) underline underline-offset-2"><code>{id}</code></a>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="mt-3 text-(--text-2)">
          No summary yet. The next checkpoint should set goal, state, next action, and risks.
        </div>
      {/if}
    </section>
  </header>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Receipt trail</h2>
    {#if data.receipts.length === 0}
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.875rem] text-(--text-2)">
        No receipts yet. The next agent action should add one.
      </div>
    {:else}
      {#each data.receipts as receipt, i}
        <a href="/receipts/{receipt.id}" class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:border-(--accent)/40 transition-colors">
          <div class="flex items-start gap-3">
            <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-(--surface-alt) text-[0.75rem] font-semibold text-(--text-2)">
              {i + 1}
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-(--text)">
                {receipt.receipt?.source ?? receipt.type}.{receipt.receipt?.action ?? 'run'}
              </div>
              <div class="text-[0.8125rem] text-(--text-2) mt-1 truncate">
                {receipt.outcome?.ok ? 'ok' : 'failed'}
                {#if receipt.artifact?.head}
                  · artifact <code>{receipt.artifact.head}</code>
                {/if}
              </div>
            </div>
          </div>
        </a>
      {/each}
    {/if}
  </section>
</div>
