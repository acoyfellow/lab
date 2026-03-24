<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
  import type { Snippet } from 'svelte';

  let {
    pageTitle,
    segment,
    children,
  }: {
    pageTitle: string;
    segment: string;
    children: Snippet;
  } = $props();
</script>

<svelte:head>
  <title>{pageTitle} - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <AppLink to={paths.docs} class="text-(--text-3) no-underline hover:text-(--text)">Docs</AppLink>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">{segment}</span>
  </p>
  <article class="md-doc">
    {@render children()}
  </article>
</div>
