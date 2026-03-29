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
  title="Step 1 · Install and First Run — lab"
  description="Install the TypeScript client, write your first chain, and see the trace output."
  path="/tutorial/step-1"
  type="website"
/>

<header class="space-y-2">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Tutorial • Step 1 of 3
    </div>
    <h1 class="text-2xl font-semibold tracking-tight">Install and First Run</h1>
    <p class="text-[0.9375rem] text-(--text-2)">
      Install the TypeScript client, write your first chain, and see the trace output.
    </p>
  </header>

  <!-- Step 1: Install -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      1. Install
    </h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
  </section>

  <!-- Step 2: Write -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      2. Write
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Create a client and run a simple chain. Each step runs in a fresh isolate.
    </p>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
  </section>

  <!-- Step 3: Run -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      3. Run
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Try it below. This is a real execution on Cloudflare's edge.
    </p>
    <MiniSandbox />
  </section>

  <!-- Step 4: Inspect -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      4. Inspect the Trace
    </h2>
    <p class="text-[0.8125rem] text-(--text-2)">
      Every run returns a <code class="font-mono text-[0.7rem]">traceId</code>. Visit <code class="font-mono text-[0.7rem]">/t/:id</code> to see the full execution trace — inputs, outputs, timing for each step.
    </p>
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
      <div class="text-[0.75rem] text-(--text-3) mb-2">Example trace output:</div>
      <pre class="text-[0.75rem] bg-(--code-bg) p-3 rounded font-mono overflow-x-auto">Roll call: Alice, Bob, Carol (3)

Trace: $LAB_URL/t/abc123...</pre>
    </div>
  </section>

  <!-- HTTP API Note -->
  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
    <h3 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Prefer HTTP?
    </h3>
    <p class="text-[0.8125rem] text-(--text-2)">
      You can also call the API directly with curl or any HTTP client. 
      <AppLink to={paths.docsHttpApi} class="text-(--accent) hover:underline">See HTTP API docs →</AppLink>
    </p>
  </section>

<TutorialPager next={{ href: paths.tutorialStep2, label: 'Step 2 · Multi-Step Chains' }} />