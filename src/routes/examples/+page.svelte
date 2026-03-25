<script lang="ts">
  import { env } from '$env/dynamic/public';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  const exampleId = $derived(env.PUBLIC_EXAMPLE_TRACE_ID ?? '');
</script>

<svelte:head>
  <title>Examples - lab</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-5 py-8 pb-16">
  <header class="mb-8">
    <h1 class="text-lg font-semibold tracking-tight">Examples</h1>
    <p class="text-[0.8125rem] text-(--text-2) mt-2 max-w-[56ch] leading-relaxed">
      Outcome-first: run something, land on
      <code class="font-(family-name:--mono) text-[0.75rem]">/t/:id</code>, optional <strong class="text-(--text) font-medium">Fork</strong>.
      Golden path:
      <a href="/tutorial" class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">tutorial</a>
      &middot;
      <AppLink to={paths.docsHttpApi} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>.
    </p>
  </header>

  <div class="grid gap-4 sm:grid-cols-2">
    <a
      href="/tutorial"
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Tutorial</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Golden path: seed (optional) → Compose → trace → fork.</div>
    </a>
    <AppLink
      to={paths.docs}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Docs</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">HTTP API, TypeScript client, capabilities, trace schema.</div>
    </AppLink>
    <a
      href="/compose"
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Chain trace (recommended)</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
        Compose opens in Chain mode. Run, then open
        <code class="font-(family-name:--mono) text-[0.7rem]">/t/:id</code>
        for per-step detail.
      </div>
    </a>
    <AppLink
      to={paths.docsHttpApi}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">curl + HTTP API</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Run modes, request shapes, curl samples — on-site.</div>
    </AppLink>
    <div
      class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-(--text) hover:bg-(--surface-alt)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">KV snapshot read</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
        <a href="/compose" class="text-(--text) underline underline-offset-2 hover:text-(--text)">Compose</a>
        → KV mode.
        <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">Seed + read</AppLink>,
        run, then
        <code class="font-(family-name:--mono) text-[0.7rem]">/t/:id</code>.
      </div>
    </div>
    <AppLink
      to={paths.docsTraceSchema}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Trace JSON</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
        Stable shape for <code class="font-(family-name:--mono) text-[0.7rem]">GET /t/:id</code> and
        <code class="font-(family-name:--mono) text-[0.7rem]">/t/:id.json</code>.
      </div>
    </AppLink>
  </div>

  <section class="mt-10 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem] text-(--text-2) leading-relaxed">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Curated example trace</div>
    {#if exampleId}
      <a href="/t/{exampleId}" class="text-(--text) font-(family-name:--mono) text-xs underline underline-offset-2">/t/{exampleId}</a>
      <p class="mt-2 text-[0.75rem] text-(--text-3)">Set <code class="font-(family-name:--mono)">PUBLIC_EXAMPLE_TRACE_ID</code> in deploy env to override.</p>
    {:else}
      <p>Run any mode in Compose, then bookmark the trace URL. Optionally set <code class="font-(family-name:--mono) text-[0.75rem]">PUBLIC_EXAMPLE_TRACE_ID</code> in <code class="font-(family-name:--mono) text-[0.75rem]">.env</code> for a stable demo link on this page.</p>
    {/if}
  </section>
</div>
