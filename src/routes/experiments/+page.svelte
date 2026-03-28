<script lang="ts">
  import SEO from '$lib/SEO.svelte';
  import AppLink from '$lib/AppLink.svelte';
</script>

<SEO
  title="Experiments — Lab"
  description="Interactive experiments built on the lab runtime."
  path="/experiments"
/>

<div class="max-w-3xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold text-(--text)">Experiments</h1>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      Focused prototypes for runtime + trace behavior.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-sm font-medium text-(--text-2)">Available</h2>
    <AppLink
      to="/experiments/garden"
      class="block no-underline rounded-lg border border-(--border) bg-(--surface) px-4 py-3 hover:border-(--accent)/40 transition-colors"
    >
      <div class="text-sm font-medium text-(--text)">Garden</div>
      <div class="text-xs text-(--text-3) mt-1">
        Your personal AI-tended garden — persistent, evolving, and unique to you.
      </div>
    </AppLink>
  </section>
</div>

