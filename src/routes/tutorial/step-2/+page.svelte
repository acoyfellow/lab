<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import MiniChain from '$lib/tutorial/MiniChain.svelte';
  import TutorialPager from '$lib/tutorial/TutorialPager.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Step 2 · Chain — lab"
  description="Chain multiple isolate steps into one run; each step uses the previous output as input."
  path="/tutorial/step-2"
  type="website"
/>

<h1 class="text-lg font-semibold text-(--text) tracking-tight m-0 mb-1">Chain a program</h1>
<p class="text-[0.8125rem] text-(--text-3) m-0 mb-8 max-w-[52ch]">
  Each array entry = one isolate. The return value becomes the next step&rsquo;s
  <code class="text-[0.75rem]">input</code>. You still get one trace for the whole run.
</p>

<ul class="m-0 mb-8 pl-5 space-y-2 text-[0.8125rem] text-(--text-2) list-disc max-w-[52ch]">
  <li>Put <code class="text-[0.75rem]">capabilities</code> on each step (e.g. only step 0 gets <code class="text-[0.75rem]">kvRead</code>).</li>
  <li>
    Presets below: simple map, or KV roll call (
    <AppLink to={paths.docsCapabilities} class="underline underline-offset-2 hover:text-(--text)">caps</AppLink>
    ).
  </li>
</ul>

<MiniChain kvTools />

<div class="mt-10 space-y-3">
  <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Minimal curl</div>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.curl}
  </div>
</div>

<TutorialPager
  prev={{ href: paths.tutorialStep1, label: 'Step 1' }}
  next={{ href: paths.tutorialStep3, label: 'Step 3 · CLI agents' }}
/>
