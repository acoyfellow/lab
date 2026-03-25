<script lang="ts">
  import { page } from '$app/state';
  import AppLink from '$lib/AppLink.svelte';

  let {
    items,
    ariaLabel = 'Breadcrumb',
  }: {
    items: readonly { href: string; label: string }[];
    ariaLabel?: string;
  } = $props();

  const pathname = $derived(page.url.pathname);
</script>

<nav
  class="pb-6 border-b border-(--border) mb-8"
  aria-label={ariaLabel}
>
  <ol
    class="flex flex-wrap items-center gap-y-2 list-none m-0 p-0 text-[0.8125rem] leading-none"
  >
    {#each items as item, i (item.href)}
      <li class="flex items-center max-w-full min-w-0">
        {#if i > 0}
          <span
            class="shrink-0 mx-2 sm:mx-2.5 text-(--text-3) text-[0.7rem] font-normal select-none"
            aria-hidden="true"
          >/</span>
        {/if}
        {#if pathname === item.href}
          <span
            class="inline-flex items-center min-h-11 sm:min-h-0 py-2.5 font-semibold text-(--text)"
            aria-current="page"
          >{item.label}</span>
        {:else}
          <AppLink
            to={item.href}
            class="inline-flex items-center min-h-11 sm:min-h-0 py-2.5 -my-0.5 px-1.5 -mx-1.5 rounded-(--radius) text-(--text-2) no-underline hover:text-(--text) hover:bg-(--surface-alt) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-focus)"
          >{item.label}</AppLink>
        {/if}
      </li>
    {/each}
  </ol>
</nav>
