<script lang="ts">
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
</script>

<SEO
  title="Spawn — lab"
  description="Run child isolates from a parent isolate using spawn(code, capabilities), with depth limits to bound recursion."
  path="/guides/spawn"
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <a href="/guides" class="text-(--text-3) no-underline hover:text-(--text)">Guides</a>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">Spawn</span>
  </p>
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-4">Spawn</h1>
  <p class="max-w-[62ch] mb-6">
    A parent isolate can call <code class="font-(family-name:--mono) text-[0.75rem]">spawn(code, capabilities)</code> to run child isolates. Depth decreases each level; at 0, spawn is unavailable — this bounds recursion structurally.
  </p>
  <p class="max-w-[62ch] mb-6">
    Run from <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">Compose</a> (Spawn mode) or <code class="font-(family-name:--mono) text-[0.75rem]">POST /run/spawn</code>.
  </p>
  <DocFooterNav
    gridClass="sm:grid-cols-2 lg:grid-cols-3"
    links={[
      { label: 'HTTP API', to: paths.docsHttpApi, description: 'POST /run/spawn, depth, capabilities.' },
      { label: 'Capabilities', to: paths.docsCapabilities, description: '`spawn` plus optional host-invoke caps.' },
      { label: 'Architecture', to: paths.docsArchitecture, description: 'Spawn, SELF binding, isolate depth.' },
    ]}
  />
</div>
