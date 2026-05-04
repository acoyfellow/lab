<script lang="ts">
  import type { PageProps } from './$types';
  import type { RunResult } from '@acoyfellow/lab';
  import SEO from '$lib/SEO.svelte';
  import { Button } from '$lib/components/ui/button';
  import { runChain } from '$lib/api';
  import { RUNNABLE_STEPS } from '$lib/home-snippets';
  import { goto } from '$app/navigation';
  import PlayIcon from '@lucide/svelte/icons/play';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

  let { data }: PageProps = $props();
  let activeTab = $state(0);
  let loading = $state(false);
  let result = $state<RunResult | null>(null);
  let error = $state<string | null>(null);

  function getStepsForTab(tabIndex: number) {
    const patternId = data.knownPatterns[tabIndex]?.id;
    return patternId ? RUNNABLE_STEPS[patternId] : undefined;
  }

  async function runDemo() {
    const steps = getStepsForTab(activeTab);
    if (!steps) return;
    loading = true;
    error = null;
    result = null;
    try {
      const r = await runChain(steps);
      result = r;
      if (!r.ok) {
        error = JSON.stringify({ error: r.error, reason: r.reason }, null, 2);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function forkInCompose() {
    const steps = getStepsForTab(activeTab);
    if (!steps) return;
    sessionStorage.setItem('lab-fork', JSON.stringify({ mode: 'chain', steps }));
    goto('/compose');
  }

  function switchTab(i: number) {
    activeTab = i;
    result = null;
    error = null;
  }
</script>

<SEO
  title="Lab — A sandbox that gives every run a shareable URL"
  description="Run JavaScript in Cloudflare V8 isolates with explicit capabilities. Every run produces a permalink agents and humans can read."
  path="/"
  type="website"
/>

<div>
  <!-- Hero -->
  <section class="relative w-full overflow-hidden">
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-[url('/bg.jpg')] bg-cover bg-position-[62%_center] sm:bg-center"
    ></div>
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-linear-to-r from-(--bg) from-0% via-(--bg)/95 via-48% to-(--bg)/15 to-100%"
    ></div>
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-(--bg)/80 pointer-events-none"
    ></div>

    <header
      class="relative z-10 max-w-3xl mx-auto px-6 py-16 max-sm:px-4 sm:py-20 md:py-24 flex flex-col justify-center"
    >
      <div class="space-y-6 max-w-170">
        <h1 class="text-[2.25rem] sm:text-[3.2rem] font-semibold tracking-tight leading-[1.02] text-(--text)">
          A sandbox<br />that hands you<br />the receipt.
        </h1>

        <p class="text-[1.0625rem] sm:text-[1.1875rem] text-(--text-2) leading-relaxed max-w-[58ch]">
          Lab runs JavaScript in Cloudflare V8 isolates. Every run gets a permalink with the code, the capabilities you granted, the inputs and outputs of each step, and the timing. Agents read the JSON. Humans open the page.
        </p>

        <div class="flex items-center gap-3 flex-wrap pt-1">
          <Button href="/compose" variant="default" size="lg">
            Try it in your browser
            <ArrowRightIcon class="size-4" />
          </Button>
          <code class="text-[0.8125rem] text-(--text-2) bg-(--surface)/85 px-2.5 py-1.5 rounded-md border border-(--border)">npm install @acoyfellow/lab</code>
        </div>
      </div>
    </header>
  </section>

  <div class="max-w-3xl mx-auto px-6 py-12 max-sm:px-4 max-sm:py-8 space-y-14">

  <!-- Runnable demo: above the fold -->
  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">Run one now</h2>
      <p class="text-[1rem] text-(--text-2) m-0">Three patterns you've used before. Pick one, run it, get a receipt URL.</p>
    </div>

    <!-- Tab bar -->
    <div class="flex gap-0 border-b border-(--border) overflow-x-auto">
      {#each data.knownPatterns as pattern, i}
        <button
          onclick={() => switchTab(i)}
          class="relative px-4 py-2.5 text-[0.8125rem] font-medium transition-colors cursor-pointer bg-transparent border-none whitespace-nowrap
            {activeTab === i ? 'text-(--text)' : 'text-(--text-3) hover:text-(--text-2)'}"
        >
          <span>{pattern.tab}</span>
          {#if activeTab === i}
            <span class="absolute bottom-0 left-0 right-0 h-[2px] bg-(--accent)"></span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Tab content -->
    {#each data.knownPatterns as pattern, i}
      {#if activeTab === i}
        <div class="space-y-3">
          <p class="text-[0.875rem] text-(--text) m-0 font-medium">
            {pattern.whatItDoes}
          </p>
          <div class="text-[0.8125rem]">
            {@html pattern.html}
          </div>
        </div>
      {/if}
    {/each}

    <!-- Run + result area -->
    <div class="flex items-center gap-3">
      <Button onclick={runDemo} disabled={loading}>
        {loading ? 'Running...' : 'Run this'}
        {#if loading}
          <Loader2Icon class="w-4 h-4 animate-spin" />
        {:else}
          <PlayIcon class="w-4 h-4" />
        {/if}
      </Button>
      <button onclick={forkInCompose} class="text-[0.875rem] text-(--text-2) hover:text-(--text) underline underline-offset-2 bg-transparent border-none cursor-pointer p-0">
        Edit in Compose
      </button>
    </div>

    {#if result && result.ok}
      <div class="rounded-(--radius) border border-emerald-500/25 bg-(--surface) p-4 space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="text-[0.8125rem] font-semibold text-emerald-500">Done</span>
          {#if result.resultId}
            <a href="/results/{result.resultId}" class="text-[0.8125rem] text-(--accent) hover:underline font-medium">
              Open the receipt →
            </a>
          {/if}
        </div>
        <pre class="font-mono text-[0.8125rem] text-(--text) m-0 overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
      </div>
    {/if}

    {#if result && !result.ok}
      <div class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-4 space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="text-[0.8125rem] font-semibold text-red-400">Failed</span>
          {#if result.resultId}
            <a href="/results/{result.resultId}" class="text-[0.8125rem] text-(--accent) hover:underline font-medium">
              Open the receipt →
            </a>
          {/if}
        </div>
        <pre class="font-mono text-[0.8125rem] text-red-500 m-0 overflow-x-auto">{JSON.stringify({ error: result.error, reason: result.reason }, null, 2)}</pre>
      </div>
    {/if}

    {#if error}
      <pre class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-500 overflow-x-auto">{error}</pre>
    {/if}
  </section>

  <!-- What a receipt looks like -->
  <section class="space-y-4">
    <div class="space-y-1">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">What you share</h2>
      <p class="text-[1rem] text-(--text-2) m-0">A receipt is one URL. Two formats: <code class="text-[0.8125rem]">/results/:id</code> for humans, <code class="text-[0.8125rem]">/results/:id.json</code> for the next agent.</p>
    </div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.receiptShape}
    </div>
  </section>

  <!-- Why it's different -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">Why this exists</h2>
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.875rem] font-semibold text-(--text)">Capabilities are explicit</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0 leading-relaxed">No capability means pure compute. Grant <code class="text-[0.75rem]">kvRead</code>, <code class="text-[0.75rem]">workersAi</code>, <code class="text-[0.75rem]">spawn</code> per step. Denied calls fail loudly.</p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.875rem] font-semibold text-(--text)">Every run is durable</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0 leading-relaxed">Code, capabilities, inputs, outputs, errors, timing — saved as canonical JSON. The receipt is the artifact, not the chat log.</p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.875rem] font-semibold text-(--text)">Agents can hand off</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0 leading-relaxed">Agent A returns a <code class="text-[0.75rem]">resultId</code>. Agent B opens the JSON and continues. No shared memory required.</p>
      </div>
    </div>
  </section>

  <!-- Where to next -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Where to next</h2>
    <div class="grid gap-3 sm:grid-cols-3">
      <a href="/tutorial" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.9375rem]">2-minute tutorial</div>
        <div class="text-[0.8125rem] text-(--text-2) mt-1">Install, run, see the JSON.</div>
      </a>

      <a href="/docs/patterns" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.9375rem]">Patterns</div>
        <div class="text-[0.8125rem] text-(--text-2) mt-1">Prove-it, self-heal, handoff, canary.</div>
      </a>

      <a href="/docs/self-host" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.9375rem]">Self-host</div>
        <div class="text-[0.8125rem] text-(--text-2) mt-1">Your account, your data, one bearer token.</div>
      </a>
    </div>
    <p class="text-[0.75rem] text-(--text-3) m-0 leading-relaxed pt-2">
      Public instance at <code class="text-[0.6875rem]">lab.coey.dev</code> is open and best-effort — anyone with a receipt URL can read it.
      Version <strong class="text-(--text-2)">v0.0.3</strong>: APIs may change before 1.0, pin exact versions.
    </p>
  </section>

  </div>
</div>
