<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import DocsSequentialFooter from '$lib/DocsSequentialFooter.svelte';
  import DocsShell from '$lib/DocsShell.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
  import { page } from '$app/state';
  import type { Snippet } from 'svelte';

  let {
    pageTitle,
    segment,
    description,
    tocItems = [],
    mdDoc = true,
    flowFooter = true,
    children,
  }: {
    pageTitle: string;
    segment: string;
    /** Defaults to a generic doc sentence. */
    description?: string;
    tocItems?: { id: string; label: string }[];
    /** When true, wrap body in `<article class="md-doc">` (markdown / patterns HTML). */
    mdDoc?: boolean;
    /** Prev/next from docs-flow reading order. */
    flowFooter?: boolean;
    children: Snippet;
  } = $props();

  const seoDescription = $derived(
    description ?? `Lab documentation: ${pageTitle}.`,
  );
</script>

<SEO
  title={`${pageTitle} — lab`}
  description={seoDescription}
  path={page.url.pathname}
  type="website"
/>

<DocsShell {tocItems}>
  <div class="max-w-3xl pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
    <p class="mb-6">
      <AppLink to={paths.docs} class="text-(--text-3) no-underline hover:text-(--text)">Docs</AppLink>
      <span class="text-(--text-3)"> / </span>
      <span class="text-(--text)">{segment}</span>
    </p>
    {#if mdDoc}
      <article class="md-doc">
        {@render children()}
      </article>
    {:else}
      <div class="space-y-10">
        {@render children()}
      </div>
    {/if}
    {#if flowFooter}
      <DocsSequentialFooter />
    {/if}
  </div>
</DocsShell>
