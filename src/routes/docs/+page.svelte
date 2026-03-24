<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
</script>

<svelte:head>
  <title>Docs - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-2">Docs</h1>
  <p class="mb-8 max-w-[62ch]">
    On-site HTTP API, architecture, TypeScript client, capabilities, and trace JSON. Canonical narrative:
    <a
      href="https://github.com/acoyfellow/lab/blob/main/README.md"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >README on GitHub</a
    >
    (versioned with the Worker).
  </p>

  <div class="grid gap-4 sm:grid-cols-2">
    <AppLink
      to={paths.docsHttpApi}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">HTTP API</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Run modes, endpoints, curl, request/response shapes.</div>
    </AppLink>
    <AppLink
      to={paths.docsTypescript}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">TypeScript client</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed"><code class="font-(family-name:--mono) text-[0.7rem]">@acoyfellow/lab</code> — install, <code class="text-[0.7rem]">createLabClient</code>, methods.</div>
    </AppLink>
    <AppLink
      to={paths.docsArchitecture}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Architecture</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Worker loaders, Effect, KV snapshot, spawn, chains — full write-up.</div>
    </AppLink>
    <AppLink
      to={paths.docsCapabilities}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Capabilities</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">KV snapshot, spawn, why shims exist.</div>
    </AppLink>
    <AppLink
      to={paths.docsTraceSchema}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Trace JSON</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed"><code class="font-(family-name:--mono) text-[0.7rem]">GET /t/&#123;id&#125;</code> document — fields, tables, POST <code class="text-[0.7rem]">traceId</code>.</div>
    </AppLink>
  </div>

  <p class="mt-10 text-[0.8125rem]">
    <a href="/tutorial" class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Tutorial</a>
    &middot;
    <a href="/examples" class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Examples</a>
  </p>
</div>
