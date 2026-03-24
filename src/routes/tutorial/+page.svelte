<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
</script>

<svelte:head>
  <title>Tutorial - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-2">Golden path</h1>
  <p class="mb-8 max-w-[62ch]">
    Short on-site walkthrough. Deeper curl and repo narrative:
    <a
      href="https://github.com/acoyfellow/lab#readme"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >README</a
    >.
  </p>

  <ol class="list-decimal list-inside space-y-8 m-0 pl-0">
    <li class="pl-1">
      <span class="font-medium text-(--text)">Seed KV (optional)</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        For KV demos, call <code class="font-(family-name:--mono) text-[0.75rem]">POST /seed</code> first. See
        <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
        (KV example) or the README.
      </p>
    </li>
    <li class="pl-1">
      <span class="font-medium text-(--text)">Run in Compose</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        Open <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">Compose</a>, pick a mode (sandbox, KV, chain, generate, spawn), run. Successful persisted runs return a
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
        Visit <code class="font-(family-name:--mono) text-[0.75rem]">/t/&#123;id&#125;</code> for the viewer, or
        <code class="font-(family-name:--mono) text-[0.75rem]">.json</code> for machine-readable output.         Document shape:
        <AppLink to={paths.docsTraceSchema} class="underline underline-offset-2 hover:text-(--text)">Trace schema</AppLink>.
      </p>
    </li>
    <li class="pl-1">
      <span class="font-medium text-(--text)">Fork (optional)</span>
      <p class="mt-2 mb-0 max-w-[62ch]">
        On a trace page, <strong class="text-(--text) font-medium">Fork</strong> hydrates Compose via session storage — same loop as described in the README habit loop.
      </p>
    </li>
  </ol>

  <p class="mt-12 pt-8 border-t border-(--border)">
    <a href="/guides/chains" class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Chains guide</a>
    &middot;
    <AppLink to={paths.docs} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Docs hub</AppLink>
  </p>
</div>
