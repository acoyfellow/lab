<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
</script>

<SEO
  title="Saved Results — lab"
  description="How result IDs map to saved results, when to open /results/:id, and when to read /results/:id.json."
  path="/guides/results"
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <a href="/guides" class="text-(--text-3) no-underline hover:text-(--text)">Guides</a>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">Saved results</span>
  </p>
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-4">Saved results</h1>
  <p class="max-w-[62ch] mb-6">
    Persisted runs return a <code class="font-(family-name:--mono) text-[0.75rem]">resultId</code>. Agents should read <code class="font-(family-name:--mono) text-[0.75rem]">/results/&#123;id&#125;.json</code>. Humans can open <code class="font-(family-name:--mono) text-[0.75rem]">/results/&#123;id&#125;</code> in the app viewer.
  </p>
  <p class="max-w-[62ch] mb-6">
    <strong class="text-(--text) font-medium">Fork</strong> on the saved-result page copies request fields into Compose via <code class="font-(family-name:--mono) text-[0.75rem]">sessionStorage</code> and navigates to <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">/compose</a>.
  </p>
  <DocFooterNav
    gridClass="sm:grid-cols-2"
    links={[
      { label: 'Saved result schema', to: paths.docsResultSchema, description: 'Saved-result schema, `/results/:id`, and `/results/:id.json` semantics.' },
      { label: 'Compose', to: '/compose', description: 'Fork from a saved result back into the runner.' },
    ]}
  />
</div>
