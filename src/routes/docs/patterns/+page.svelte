<script lang="ts">
  import type { PageProps } from './$types';
  import DocsArticle from '$lib/DocsArticle.svelte';
  import { PATTERNS_DOC_TOC } from '$lib/docs-patterns-toc';

  let { data }: PageProps = $props();

  const tocItems = [...PATTERNS_DOC_TOC];
</script>

<DocsArticle
  pageTitle="Agent Patterns"
  segment="Patterns"
  description="Agent patterns for sandboxed execution: prove-it, self-healing, handoff, canary deploy, stress test."
  {tocItems}
>
  {@html data.articleHtml}
</DocsArticle>
