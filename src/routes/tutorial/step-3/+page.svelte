<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import TutorialPager from '$lib/tutorial/TutorialPager.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Step 3 · Agents — lab"
  description="Use the same LAB_URL across CLI agents; generate chain steps, run them, and share traces as handoff artifacts."
  path="/tutorial/step-3"
  type="website"
/>

<h1 class="text-lg font-semibold text-(--text) tracking-tight m-0 mb-1">Many agents, one lab</h1>
<p class="text-[0.8125rem] text-(--text-3) m-0 mb-6 max-w-[52ch]">
  Same <code class="text-[0.75rem]">LAB_URL</code> for every CLI agent. This repo includes a script that runs a real Pi
  session, then derives guest chain steps and calls <code class="text-[0.75rem]">lab.runChain</code>.
</p>

<ul class="m-0 mb-6 pl-5 space-y-2 text-[0.8125rem] text-(--text-2) list-disc max-w-[52ch]">
  <li>Pi: <code class="text-[0.7rem]">createAgentSession</code> + <code class="text-[0.7rem]">session.prompt</code> (needs Pi auth).</li>
  <li>Lab: chain steps built from <code class="text-[0.7rem]">session.state.messages.length</code>, then traced.</li>
  <li>Prints a <code class="text-[0.7rem]">trace:</code> URL — open it in the browser to verify.</li>
</ul>

<div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-4 mb-8 text-[0.8125rem] text-(--text-2) space-y-2">
  <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Run it locally</div>
  <ol class="m-0 pl-5 space-y-1 list-decimal">
    <li><code class="text-[0.7rem]">bun dev</code> (Worker on :1337) or set <code class="text-[0.7rem]">LAB_URL</code> to your deploy.</li>
    <li>
      <code class="font-(family-name:--mono) text-[0.7rem]">bun run pi:lab-bridge</code> with Pi configured (API keys),
      or <code class="font-(family-name:--mono) text-[0.7rem]">SKIP_PI=1 bun run pi:lab-bridge</code> to exercise only the
      lab chain and still get a clickable trace.
    </li>
    <li>Open the printed <code class="text-[0.7rem]">trace:</code> URL.</li>
  </ol>
  <p class="m-0 text-[0.75rem] text-(--text-3)">
    Source:
    <a
      href="https://github.com/acoyfellow/lab/blob/main/scripts/pi-lab-bridge.ts"
      class="text-(--text) underline underline-offset-2"
    ><code class="text-[0.65rem]">scripts/pi-lab-bridge.ts</code></a
    >
    · Pi minimal SDK:
    <a
      href="https://github.com/badlogic/pi-mono/blob/21950c5ba434fcbd2f29f1264b329da0b130082d/packages/coding-agent/examples/sdk/01-minimal.ts"
      class="text-(--text) underline underline-offset-2"
    >01-minimal.ts</a
    >.
  </p>
</div>

<div class="space-y-8">
  <div>
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">
      Working bridge (repo script)
    </div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.piLabBridge}
    </div>
  </div>
  <div>
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Lab client only</div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.labClient}
    </div>
  </div>
  <div>
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Fetch trace JSON</div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.fetchTrace}
    </div>
  </div>
  <p class="m-0 text-[0.8125rem] text-(--text-2) max-w-[52ch]">
    Without Pi:
    <code class="font-(family-name:--mono) text-[0.7rem]">LAB_URL=… bun run dogfood:lab</code>
    ·
    <AppLink to={paths.docsTypescript} class="underline underline-offset-2 hover:text-(--text)">Client docs</AppLink>
  </p>
</div>

<TutorialPager prev={{ href: paths.tutorialStep2, label: 'Step 2' }} />
