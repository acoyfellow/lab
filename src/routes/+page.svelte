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

  const featuredExamples = [
    {
      title: 'Code mode — but verified',
      badge: '10/10',
      href: '/docs/patterns#prove-it',
      description: 'Agent writes a function, generates edge cases, runs them. The receipt shows the cases, the assertions, and the verdict.'
    },
    {
      title: 'Self-healing loop',
      badge: 'Fix',
      href: '/docs/patterns#self-healing-loop',
      description: 'A run fails. The receipt has the error. The agent reads its own receipt, patches, retries.'
    },
    {
      title: 'Multi-agent handoff',
      badge: 'URL',
      href: '/docs/patterns#agent-handoff',
      description: 'Agent A finishes. Agent B opens the URL and continues. The receipt is the entire interface — no queue, no shared DB.'
    }
  ];

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
  title="Lab — Receipts for agent work"
  description="When an agent runs code, Lab returns a URL with the full execution record. Readable by the next agent, verifiable by you."
  path="/"
  type="website"
/>

<div class="">
  <section
    class="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden "
  >
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
      class="relative z-10 max-w-3xl mx-auto px-6 py-12 max-sm:px-4 sm:py-14 md:py-16 min-h-[min(42vh,400px)] flex flex-col justify-center"
    >
      <div class="space-y-5 max-w-160">
        <h1 class="text-[1.85rem] sm:text-[2.5rem] font-semibold tracking-tight leading-[1.1] text-(--text) drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          Receipts for agent work.
        </h1>

        <p class="text-[1.0625rem] sm:text-[1.125rem] text-(--text-2) leading-relaxed max-w-[60ch]">
          Your agent runs code. Lab returns a stable URL with the full execution record — code, inputs, outputs, errors, capabilities granted at each step. <span class="text-(--text)">Readable by the next agent, auditable by you.</span>
        </p>

        <div class="flex items-center gap-3 flex-wrap pt-1">
          <Button href="/compose" variant="default">Open the editor</Button>
          <code class="text-[0.8125rem] text-(--text-2) bg-(--surface)/70 px-2.5 py-1 rounded-md border border-(--border)">npm install @acoyfellow/lab</code>
        </div>
      </div>
    </header>
  </section>

  <div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-14">

  <!-- Why this exists + receipt shape, in one section -->
  <section class="space-y-4">
    <div class="border-l-2 border-(--accent) pl-5 space-y-2">
      <p class="text-[1.0625rem] text-(--text) leading-relaxed m-0 font-medium">
        LLMs do work, then describe what they did. The description is not the work.
      </p>
      <p class="text-[0.875rem] text-(--text-2) leading-relaxed m-0">
        Lab runs the work in a Cloudflare V8 isolate, gates host calls behind explicit capabilities, and saves the full record at <code class="text-[0.8125rem]">/results/:id</code> — viewable in a browser or fetched as <code class="text-[0.8125rem]">.json</code> by another agent.
      </p>
    </div>

    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.receiptShape}
    </div>
    <p class="text-[0.8125rem] text-(--text-3) m-0">Stable URL, append-only. Each step lists the capabilities it was granted — <code class="text-[0.75rem]">kvRead</code>, <code class="text-[0.75rem]">workersAi</code>, <code class="text-[0.75rem]">spawn</code>, … Default is none. Code only gets what you explicitly pass.</p>
  </section>

  <!-- First request: SDK + curl side by side -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">Your first request</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="space-y-1.5">
        <div class="text-[0.75rem] text-(--text-3) font-medium">From a TypeScript agent</div>
        <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
          {@html data.codeHtml.sdk}
        </div>
      </div>
      <div class="space-y-1.5">
        <div class="text-[0.75rem] text-(--text-3) font-medium">From a terminal</div>
        <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
          {@html data.codeHtml.curl}
        </div>
      </div>
    </div>
  </section>

  <!-- Runnable demo -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">See it run</h2>

    <!-- Tab bar -->
    <div class="flex gap-0 border-b border-(--border)">
      {#each data.knownPatterns as pattern, i}
        <button
          onclick={() => switchTab(i)}
          class="relative px-4 py-2.5 text-[0.8125rem] font-medium transition-colors cursor-pointer bg-transparent border-none
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
        {loading ? 'Running...' : 'Run this example'}
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
          <span class="text-[0.8125rem] font-semibold text-emerald-500">Ran successfully</span>
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

  <!-- What agents do with this -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">What agents do with this</h2>
    <div class="space-y-3">
      {#each featuredExamples as example}
        <a href={example.href} class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
          <div class="flex items-start gap-3">
            <span class="flex-shrink-0 mt-0.5 min-w-8 h-8 rounded-full bg-(--surface-alt) text-(--text-2) flex items-center justify-center text-[0.6875rem] font-bold px-2">{example.badge}</span>
            <div>
              <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.875rem]">{example.title}</div>
              <p class="text-[0.8125rem] text-(--text-2) m-0 mt-0.5">{example.description}</p>
            </div>
          </div>
        </a>
      {/each}
    </div>
    <a href="/docs/patterns" class="inline-block text-[0.8125rem] text-(--accent) hover:underline font-medium mt-1">All 5 patterns →</a>
  </section>

  <!-- Where to next -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Where to next</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <a href="/tutorial" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">2-minute tutorial</div>
          <div class="text-[0.8125rem] text-(--text-2)">From <code class="text-[0.75rem]">npm install</code> to your first receipt URL.</div>
        </div>
      </a>

      <a href="/docs/self-host" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Self-host on Cloudflare</div>
          <div class="text-[0.8125rem] text-(--text-2)">Your account, your data, lock down the API with a bearer token.</div>
        </div>
      </a>
    </div>
    <div class="space-y-1 pt-1">
      <p class="text-[0.75rem] text-(--text-3) m-0 leading-relaxed">
        <strong class="text-(--text-2)">Public instance</strong> at <code class="text-[0.6875rem]">lab.coey.dev</code>: open and best-effort. Anyone with a receipt URL can read it.
      </p>
      <p class="text-[0.75rem] text-(--text-3) m-0 leading-relaxed">
        <strong class="text-(--text-2)">Self-host</strong>: set <code class="text-[0.6875rem]">LAB_AUTH_TOKEN</code> and every request requires <code class="text-[0.6875rem]">Authorization: Bearer …</code>. SDK and MCP server both accept the token. Receipt URLs aren't reachable without it.
      </p>
      <p class="text-[0.75rem] text-(--text-3) m-0 leading-relaxed">
        Version <strong class="text-(--text-2)">v0.0.3</strong>: APIs may change before 1.0 — pin exact versions.
      </p>
    </div>
  </section>

  </div>
</div>
