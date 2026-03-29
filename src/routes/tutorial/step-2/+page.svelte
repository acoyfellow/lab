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
  title="Step 2 · Multi-Step Chains — lab"
  description="Chain multiple isolate steps into one run; each step uses the previous output as input."
  path="/tutorial/step-2"
  type="website"
/>

<header class="space-y-2">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Tutorial • Step 2 of 3
    </div>
    <h1 class="text-2xl font-semibold tracking-tight">Multi-Step Chains</h1>
    <p class="text-[0.9375rem] text-(--text-2)">
      Chain multiple isolates together. Pass data between steps, use capabilities per-step, and get one trace for the entire run.
    </p>
  </header>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      1. Install
    </h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      2. Write
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Each step runs in a fresh isolate. The return value becomes the next step's <code class="font-mono text-[0.7rem]">input</code>.
    </p>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
  </section>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      3. Run
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Try it below. See how data flows from step 1 → step 2 → step 3.
    </p>
    <MiniChain kvTools />
  </section>

  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      4. Inspect the Trace
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      One traceId for the entire chain. Each step shows its input, output, and execution time.
    </p>
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
      <div class="text-[0.75rem] text-(--text-3) mb-2">Example trace output:</div>
      <pre class="text-[0.75rem] bg-(--code-bg) p-3 rounded font-mono overflow-x-auto">{`Step 1: [1, 2, 3]
Step 2: 3
Step 3: { count: 3, items: "1, 2, 3" }

Trace: https://lab.coey.dev/t/abc123...`}</pre>
    </div>
  </section>

  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
    <h3 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Capabilities
    </h3>
    <p class="text-[0.8125rem] text-(--text-2)">
      Each step declares its own capabilities. Only give <code class="font-mono text-[0.7rem]">kvRead</code> to steps that need it. 
      <AppLink to={paths.docsCapabilities} class="text-(--accent) hover:underline">Learn more →</AppLink>
    </p>
  </section>

<TutorialPager
  prev={{ href: paths.tutorialStep1, label: 'Step 1 · Install and First Run' }}
  next={{ href: paths.tutorialStep3, label: 'Step 3 · Agents and Handoffs' }}
/>