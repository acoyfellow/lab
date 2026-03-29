<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import { page } from '$app/state';
  import { DOCS_READING_ORDER } from '$lib/docs-flow';

  const pathname = $derived(page.url.pathname);
  const idx = $derived(DOCS_READING_ORDER.findIndex((e) => e.to === pathname));
  const prev = $derived(idx > 0 ? DOCS_READING_ORDER[idx - 1] : null);
  const next = $derived(
    idx >= 0 && idx < DOCS_READING_ORDER.length - 1 ? DOCS_READING_ORDER[idx + 1] : null,
  );

  const linkClass =
    'block rounded-(--radius) border border-(--border) bg-(--surface) px-4 py-3 no-underline hover:bg-(--surface-alt) transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-focus) max-w-md w-full';
</script>

{#if prev || next}
  <nav
    class="flex flex-wrap gap-3 justify-between items-stretch pt-8 mt-10 border-t border-(--border)"
    aria-label="Previous and next page"
  >
    <div class="min-w-0 flex-1 flex justify-start">
      {#if prev}
        <AppLink to={prev.to} class={linkClass}>
          <span class="block docs-section-label font-medium">Previous</span>
          <span class="block text-[0.9375rem] font-semibold text-(--text) mt-0.5">{prev.label}</span>
        </AppLink>
      {/if}
    </div>
    <div class="min-w-0 flex-1 flex justify-end">
      {#if next}
        <AppLink to={next.to} class={`${linkClass} text-right`}>
          <span class="block docs-section-label font-medium">Next</span>
          <span class="block text-[0.9375rem] font-semibold text-(--text) mt-0.5">{next.label}</span>
        </AppLink>
      {/if}
    </div>
  </nav>
{/if}
