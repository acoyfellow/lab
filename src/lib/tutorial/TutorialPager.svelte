<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';

  let {
    prev,
    next,
  }: {
    prev?: { href: string; label: string };
    next?: { href: string; label: string };
  } = $props();

  const linkClass =
    'block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text) transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-focus)';
</script>

<nav
  class="mt-12 pt-8 border-t border-(--border) grid grid-cols-1 sm:grid-cols-2 gap-3"
  aria-label="Tutorial navigation"
>
  {#if prev}
    <AppLink to={prev.href} class="{linkClass} {next ? '' : 'sm:col-span-2'}">
      <span class="block text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Previous</span>
      <span class="block text-[0.9375rem] font-semibold tracking-tight mt-1.5">&larr; {prev.label}</span>
    </AppLink>
  {/if}
  {#if next}
    <AppLink
      to={next.href}
      class="{linkClass} {prev ? 'sm:text-right' : 'sm:col-span-2'}"
    >
      <span class="block text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Next</span>
      <span class="block text-[0.9375rem] font-semibold tracking-tight mt-1.5">{next.label} &rarr;</span>
    </AppLink>
  {/if}
</nav>
