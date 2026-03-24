<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
</script>

<svelte:head>
  <title>Traces - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <a href="/guides" class="text-(--text-3) no-underline hover:text-(--text)">Guides</a>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">Traces</span>
  </p>
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-4">Traces</h1>
  <p class="max-w-[62ch] mb-6">
    Persisted runs return a <code class="font-(family-name:--mono) text-[0.75rem]">traceId</code>. Open <code class="font-(family-name:--mono) text-[0.75rem]">/t/&#123;id&#125;</code> in the app for a human-readable viewer, or append <code class="font-(family-name:--mono) text-[0.75rem]">.json</code> for the raw document.
  </p>
  <p class="max-w-[62ch] mb-6">
    <strong class="text-(--text) font-medium">Fork</strong> on a trace page copies request fields into Compose via <code class="font-(family-name:--mono) text-[0.75rem]">sessionStorage</code> and navigates to <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">/compose</a>.
  </p>
  <p class="max-w-[62ch] mb-8">
    <strong class="text-(--text) font-medium">Details:</strong>
    <AppLink to={paths.docsTraceSchema} class="underline underline-offset-2 hover:text-(--text)">Trace schema</AppLink>
    &middot;
    <a
      href="https://github.com/acoyfellow/lab/blob/main/README.md"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >README (Habit loop section)</a
    >.
  </p>
</div>
