<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import MiniSandbox from '$lib/tutorial/MiniSandbox.svelte';
  import TutorialPager from '$lib/tutorial/TutorialPager.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Step 1 · First trace — lab"
  description="One POST → one traceId → inspect it on /t/:id (and .json for raw)."
  path="/tutorial/step-1"
  type="website"
/>

<h1 class="text-lg font-semibold text-(--text) tracking-tight m-0 mb-1">First trace</h1>
<p class="text-[0.8125rem] text-(--text-3) m-0 mb-8 max-w-[52ch]">
  One POST → one <code class="text-[0.75rem]">traceId</code> → inspect on <code class="text-[0.75rem]">/t/:id</code>.
</p>

<ul class="m-0 mb-8 pl-5 space-y-2 text-[0.8125rem] text-(--text-2) list-disc max-w-[52ch]">
  <li>Guest code runs in a Worker isolate (not your laptop).</li>
  <li>The trace is the durable artifact: inputs, outputs, errors.</li>
  <li>Append <code class="text-[0.75rem]">.json</code> for machine-readable output.</li>
</ul>

<MiniSandbox />

<div class="mt-10 space-y-3">
  <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Same call with curl</div>
  <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
    {@html data.codeHtml.curl}
  </div>
  <p class="m-0 text-[0.75rem] text-(--text-3) max-w-[52ch]">
    Swap the host for your deploy. Full shapes:
    <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>.
  </p>
</div>

<TutorialPager next={{ href: paths.tutorialStep2, label: 'Step 2 · Chain a program' }} />
