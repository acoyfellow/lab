<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
</script>

<SEO
  title="Chains — lab"
  description="Run multi-step pipelines where each step gets the prior output as input, with per-step capabilities and full trace arrays."
  path="/guides/chains"
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <a href="/guides" class="text-(--text-3) no-underline hover:text-(--text)">Guides</a>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">Chains</span>
  </p>
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-4">Chains</h1>
  <p class="max-w-[62ch] mb-6">
    Use a chain when each step needs the previous step&rsquo;s output as <code class="font-(family-name:--mono) text-[0.75rem]">input</code>, with different capabilities per step, and you want a full
    <code class="font-(family-name:--mono) text-[0.75rem]">trace</code> array on the result.
  </p>
  <p class="max-w-[62ch] mb-6">
    Try it in <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">Compose</a> (Chain mode) or call <code class="font-(family-name:--mono) text-[0.75rem]">POST /run/chain</code> from scripts.
  </p>
  <DocFooterNav
    gridClass="sm:grid-cols-2"
    links={[
      { label: 'HTTP API', to: paths.docsHttpApi, description: 'POST /run/chain, curl, request bodies.' },
      { label: 'Capabilities', to: paths.docsCapabilities, description: 'Per-step strings; bindings and tradeoffs.' },
    ]}
  />
</div>
