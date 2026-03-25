<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
</script>

<SEO
  title="Traces — lab"
  description="How trace IDs work, how to view /t/:id, export JSON, and fork runs back into Compose."
  path="/guides/traces"
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
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
  <DocFooterNav
    gridClass="sm:grid-cols-2"
    links={[
      { label: 'Trace schema', to: paths.docsTraceSchema, description: 'GET /t/:id JSON shape and tables.' },
      { label: 'Compose', to: '/compose', description: 'Fork from a trace back into the runner.' },
    ]}
  />
</div>
