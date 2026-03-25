<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
</script>

<SEO
  title="Docs — lab"
  description="HTTP API, architecture, TypeScript client, capabilities, and trace JSON."
  path="/docs"
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-2">Docs</h1>
  <p class="mb-8 max-w-[62ch]">
    HTTP API, architecture, TypeScript client, capabilities, and trace JSON—all served from this app.
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
      to={paths.docsAgentIntegration}
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
    >
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Agents</div>
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">MCP <code class="font-(family-name:--mono) text-[0.7rem]">find</code> + <code class="text-[0.7rem]">execute</code>, or <code class="text-[0.7rem]">GET /lab/catalog</code> + HTTP runs.</div>
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
      <div class="text-[0.8125rem] text-(--text-2) leading-relaxed"><code class="font-(family-name:--mono) text-[0.7rem]">GET /t/:id</code> document — fields, tables, POST <code class="text-[0.7rem]">traceId</code>.</div>
    </AppLink>
  </div>

  <DocFooterNav
    gridClass="sm:grid-cols-2"
    links={[
      { label: 'Tutorial', to: paths.tutorial, description: 'Three steps with inline runners.' },
      { label: 'Compose', to: '/compose', description: 'Run modes in the browser.' },
    ]}
  />
</div>
