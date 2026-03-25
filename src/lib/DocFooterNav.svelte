<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';

  type Internal = { label: string; description?: string; to: string };
  type External = { label: string; description?: string; href: string; external?: boolean };

  let {
    links,
    gridClass = 'sm:grid-cols-2 lg:grid-cols-3',
    compactTop = false,
    tone = 'footer',
  }: {
    links: (Internal | External)[];
    /** Tailwind grid column classes (no `grid` prefix). */
    gridClass?: string;
    /** When true, less top margin (e.g. global site footer). */
    compactTop?: boolean;
    /** `section` = in-page CTA row (no top rule). `footer` = end-of-article / global footer spacing. */
    tone?: 'footer' | 'section';
  } = $props();

  function isInternal(item: Internal | External): item is Internal {
    return 'to' in item;
  }

  const linkClass =
    'doc-footer-nav__link block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text) transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--border-focus)';
</script>

<nav
  class="doc-footer-nav grid gap-3 grid-cols-1 {gridClass} {tone === 'section'
    ? 'mb-8'
    : compactTop
      ? 'pt-2'
      : 'pt-8 mt-10 border-t border-(--border)'}"
  aria-label="Related links"
>
  {#each links as item}
    {#if isInternal(item)}
      <AppLink to={item.to} class={linkClass}>
        <span class="block text-[0.9375rem] font-semibold tracking-tight text-(--text)">{item.label}</span>
        {#if item.description}
          <span class="block text-[0.8125rem] font-normal text-(--text-2) leading-relaxed mt-1.5">{item.description}</span>
        {/if}
      </AppLink>
    {:else}
      <a
        href={item.href}
        class={linkClass}
        target={item.href.startsWith('http') ? '_blank' : undefined}
        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        <span class="block text-[0.9375rem] font-semibold tracking-tight text-(--text)">{item.label}</span>
        {#if item.description}
          <span class="block text-[0.8125rem] font-normal text-(--text-2) leading-relaxed mt-1.5">{item.description}</span>
        {/if}
      </a>
    {/if}
  {/each}
</nav>
