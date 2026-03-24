<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>lab — parallel work on the edge, chains, traces</title>
</svelte:head>

<div class="max-w-[640px] mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-12">
  <section class="scroll-mt-6 space-y-4" aria-labelledby="intro">
    <h1 id="intro" class="text-(--text) text-[1.35rem] sm:text-[1.5rem] font-semibold tracking-tight leading-snug">
      Parallelize work on the edge
    </h1>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Fan out steps on <strong class="text-(--text) font-medium">Cloudflare Workers</strong> instead of on your laptop. You send a small request; the edge runs <strong class="text-(--text) font-medium">multiple isolates in parallel</strong> when the job allows it, or a <strong class="text-(--text) font-medium">chain</strong> when each step needs the last one’s output.
    </p>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Call it from anywhere—even a <strong class="text-(--text) font-medium">resource‑limited</strong> machine (thin client, no local sandbox).</p>
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed"></p>
    </p>
    <div class="flex flex-wrap gap-2 pt-1">
      <a
        href="/compose"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) no-underline hover:bg-(--accent-hover)"
      >Run in the browser</a>
      <a
        href="/examples"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >Browse examples</a>
      <a
        href="#from-code"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >Call from TypeScript</a>
      <AppLink
        to={paths.docs}
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >Docs</AppLink>
      <a
        href="https://github.com/acoyfellow/lab#readme"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >README</a>
    </div>
  </section>

  <section id="from-code" class="scroll-mt-6 space-y-3" aria-labelledby="code-heading">
    <h2 id="code-heading" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      TypeScript client
    </h2>
    <p class="text-[0.8125rem] text-(--text-2) leading-relaxed m-0">
      <code class="font-(family-name:--mono) text-[0.75rem]">npm install @acoyfellow/lab</code>. Set <code class="font-(family-name:--mono) text-[0.75rem]">baseUrl</code> to the hosted worker or your deploy. Use from scripts, CI, or anything that can call HTTP.
    </p>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
  </section>

  <section class="border-t border-(--border) pt-8 text-[0.75rem] text-(--text-3) leading-relaxed space-y-2">
    <p class="m-0">
      <strong class="text-(--text-2) font-medium">Full API spec</strong> (endpoints, curl, self-host) —
      <a href="https://github.com/acoyfellow/lab#readme" target="_blank" rel="noopener noreferrer" class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">GitHub README</a>.
      On-site: <AppLink to={paths.docs} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Docs</AppLink>
      &middot;
      <AppLink to={paths.docsTraceSchema} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">trace schema</AppLink>.
    </p>
  </section>
</div>
