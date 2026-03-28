<script lang="ts">
  import { page } from '$app/state';
  import SEO from '$lib/SEO.svelte';
  import AppLink from '$lib/AppLink.svelte';
  import AuthButton from '$lib/components/AuthButton.svelte';

  let authed = $derived(!!page.data.experimentAuth?.authenticated);
</script>

<SEO
  title="Experiments — Lab"
  description="Interactive experiments built on the lab runtime."
  path="/experiments"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  <header class="space-y-3">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Experiments</h1>
      <AuthButton />
    </div>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      Each experiment tests a different runtime pattern — game loops, learning from traces, spawning isolates.
      {#if !authed}
        <span class="text-(--accent)">Sign in with GitHub to play.</span>
      {/if}
    </p>
  </header>

  <section class="space-y-3">
    <AppLink
      to="/experiments/garden"
      class="block no-underline rounded-lg border border-(--border) bg-(--surface) px-4 py-3 hover:border-(--accent)/40 transition-colors"
    >
      <div class="text-sm font-medium text-(--text)">Garden</div>
      <div class="text-xs text-(--text-3) mt-1">
        D3 force graph tended by an LLM. Nodes grow, connect, and evolve across sessions.
      </div>
    </AppLink>
    <AppLink
      to="/experiments/canvas"
      class="block no-underline rounded-lg border border-(--border) bg-(--surface) px-4 py-3 hover:border-(--accent)/40 transition-colors"
    >
      <div class="text-sm font-medium text-(--text)">Tic-Tac-Toe</div>
      <div class="text-xs text-(--text-3) mt-1">
        Play against an LLM that sees the real board state as structured JSON and picks its move.
      </div>
    </AppLink>
    <AppLink
      to="/experiments/drop-four"
      class="block no-underline rounded-lg border border-(--border) bg-(--surface) px-4 py-3 hover:border-(--accent)/40 transition-colors"
    >
      <div class="text-sm font-medium text-(--text)">Drop Four</div>
      <div class="text-xs text-(--text-3) mt-1">
        6 AI personalities play a round-robin Connect 4 tournament in parallel isolates, then you challenge the winner.
      </div>
    </AppLink>
    <AppLink
      to="/experiments/versus"
      class="block no-underline rounded-lg border border-(--border) bg-(--surface) px-4 py-3 hover:border-(--accent)/40 transition-colors"
    >
      <div class="text-sm font-medium text-(--text)">Versus</div>
      <div class="text-xs text-(--text-3) mt-1">
        1v1 Connect 4 — minimax handles tactics, a minimal LLM prompt breaks ties, and traced losses feed the next game.
      </div>
    </AppLink>
  </section>
</div>
