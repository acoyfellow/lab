<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import DocsSequentialFooter from '$lib/DocsSequentialFooter.svelte';
  import DocsShell from '$lib/DocsShell.svelte';
  import { paths } from '$lib/paths';

  let { children } = $props();
</script>

<DocsShell tocItems={[]}>
  <div class="max-w-3xl pb-16 docs-prose leading-relaxed">
    <p class="mb-6">
      <AppLink to={paths.docs} class="text-(--text-3) no-underline hover:text-(--text)">Docs</AppLink>
      <span class="text-(--text-3)"> / </span>
      <span class="text-(--text) font-medium">Tutorial</span>
    </p>
    <div class="space-y-8">
      {@render children()}
    </div>
    <DocsSequentialFooter />
  </div>
</DocsShell>
