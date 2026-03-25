<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import { paths } from '$lib/paths';
</script>

<svelte:head>
  <title>Tutorial - lab</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-2">Golden path</h1>
  <p class="mb-4 max-w-[62ch]">
    Seed (optional) → Compose → open <code class="font-(family-name:--mono) text-[0.75rem]">/t/:id</code> → fork back into Compose.
  </p>

  <DocFooterNav
    tone="section"
    gridClass="sm:grid-cols-2 lg:grid-cols-3"
    links={[
      { label: 'Compose', to: '/compose', description: 'Chain first; KV, sandbox, generate, spawn.' },
      { label: 'HTTP API', to: paths.docsHttpApi, description: 'Endpoints, curl, run modes.' },
      { label: 'Trace schema', to: paths.docsTraceSchema, description: 'What GET /t/:id returns.' },
    ]}
  />

  <ol class="list-decimal list-inside space-y-8 m-0 pl-0">
    <li class="pl-1">
      <span class="font-medium text-(--text)">Seed KV (optional)</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        For KV demos, call <code class="font-(family-name:--mono) text-[0.75rem]">POST /seed</code> first. See
        <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
        (KV example) or the <AppLink to={paths.docs} class="underline underline-offset-2 hover:text-(--text)">docs hub</AppLink>.
      </p>
    </li>
    <li class="pl-1">
      <span class="font-medium text-(--text)">Run in Compose</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        Open <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">Compose</a>.
        <strong class="text-(--text) font-medium">Chain</strong> is the default (two steps, per-step trace in
        <code class="font-(family-name:--mono) text-[0.75rem]">/t/:id</code>); switch mode for KV, sandbox,
        generate, or spawn. Successful runs return a
        <code class="font-(family-name:--mono) text-[0.75rem]">traceId</code>.
      </p>
      <p class="mt-2 mb-0">
        Mode → endpoint mapping:
        <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">Run modes (on-site)</AppLink>.
      </p>
    </li>
    <li class="pl-1">
      <span class="font-medium text-(--text)">Open the trace</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        Visit <code class="font-(family-name:--mono) text-[0.75rem]">/t/:id</code> for the viewer, or
        <code class="font-(family-name:--mono) text-[0.75rem]">.json</code> for machine-readable output.         Document shape:
        <AppLink to={paths.docsTraceSchema} class="underline underline-offset-2 hover:text-(--text)">Trace schema</AppLink>.
      </p>
    </li>
    <li class="pl-1">
      <span class="font-medium text-(--text)">Fork (optional)</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        On a trace page, <strong class="text-(--text) font-medium">Fork</strong> copies the request into Compose so you can edit and run again.
      </p>
    </li>
  </ol>

  <DocFooterNav
    gridClass="sm:grid-cols-2"
    links={[
      { label: 'Examples', to: '/examples', description: 'Demos and bookmarkable traces.' },
      { label: 'Guides', to: '/guides', description: 'Chains, spawn, traces workflows.' },
    ]}
  />
</div>
