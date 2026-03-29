<script lang="ts">
  import type { PageProps } from './$types';
  import type { RunResult } from '@acoyfellow/lab';
  import SEO from '$lib/SEO.svelte';
  import { Button } from '$lib/components/ui/button';
  import { version as appVersion } from '$app/environment';
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
      description: 'Agent writes a function, generates edge cases, runs them all. 10/10 pass — this run\'s result URL shows the cases, assertions, and verdict.'
    },
    {
      title: 'Auto-fix pipeline',
      badge: 'Fix',
      href: '/docs/patterns#self-healing-loop',
      description: 'A run fails. The saved result includes the error. The agent uses that result to patch the code and rerun.'
    },
    {
      title: 'Multi-agent relay',
      badge: 'URL',
      href: '/docs/patterns#agent-handoff',
      description: 'Agent A researches. Agent B synthesizes. Agent C delivers. Each one picks up where the last left off — one result URL ties the run together.'
    },
    {
      title: 'Compare before you ship',
      badge: 'Diff',
      href: '/docs/patterns#canary-deploy',
      description: 'Old logic vs new logic, same inputs. See exactly what changed before you deploy.'
    },
    {
      title: 'Stress test',
      badge: 'N',
      href: '/docs/patterns#stress-test',
      description: 'Run it 10 times. If run 7 breaks, your instructions are ambiguous. Try with a dumber model to find the floor.'
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

  // Reset result when switching tabs
  function switchTab(i: number) {
    activeTab = i;
    result = null;
    error = null;
  }
</script>

<SEO
  title="Lab — Run agent code. Get proof it worked."
  description="Agents write code. Lab runs it in a Cloudflare sandbox and saves a result at a URL. Successful runs include full step data. Failed or aborted runs include the error and reason; per-step detail may be partial."
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
      <div class="space-y-4 max-w-160">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface)/90 backdrop-blur-sm border border-(--border) text-[0.75rem] text-(--text-2) shadow-sm"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          v{appVersion} — experimental (here be dragons)
        </div>

        <h1 class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15] text-(--text) drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          Run agent code.<br />
          <span class="text-(--text-2)">Get proof it worked.</span>
        </h1>

        <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
          An agent writes code. Lab runs it in a <strong class="text-(--text)">Cloudflare sandbox</strong> and saves a result at a <strong class="text-(--text)">URL</strong>. Successful runs include full step data. Failed or aborted runs include the error and reason; per-step detail may be partial.
        </p>
        <div class="flex items-center gap-3 flex-wrap">
          <Button href="/compose" variant="default">Open Compose</Button>
          <a href="/examples" class="text-[0.8125rem] text-(--accent) hover:underline">browse examples →</a>
        </div>
      </div>
    </header>
  </section>

  <div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-12">

  <!-- Runnable pattern tabs -->
  <section class="space-y-4">
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
          <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-x-auto text-[0.8125rem]">
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
        Fork in Compose
      </button>
      <a href="/docs/patterns" class="text-[0.8125rem] text-(--accent) hover:underline font-medium ml-auto">All 6 patterns →</a>
    </div>

    {#if result && result.ok}
      <div class="rounded-(--radius) border border-emerald-500/25 bg-(--surface) p-4 space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <span class="text-[0.8125rem] font-semibold text-emerald-500">Ran successfully</span>
          {#if result.traceId}
            <a href="/t/{result.traceId}" class="text-[0.8125rem] text-(--accent) hover:underline font-medium">
              Open the saved result →
            </a>
          {/if}
        </div>
        <pre class="font-mono text-[0.8125rem] text-(--text) m-0 overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
      </div>
    {/if}

    {#if result && !result.ok}
      <div class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-4 space-y-2">
        <span class="text-[0.8125rem] font-semibold text-red-400">Failed</span>
        {#if result.traceId}
          <a href="/t/{result.traceId}" class="text-[0.8125rem] text-(--accent) hover:underline font-medium block">
            Open the result to see what happened →
          </a>
        {/if}
        <pre class="font-mono text-[0.8125rem] text-red-500 m-0 overflow-x-auto">{JSON.stringify({ error: result.error, reason: result.reason }, null, 2)}</pre>
      </div>
    {/if}

    {#if error}
      <pre class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-500 overflow-x-auto">{error}</pre>
    {/if}
  </section>

  <!-- What you get back -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Every run gets a saved result URL</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Proof, not promises</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Successful runs include step data, inputs, outputs, and timing. Every run saves a result URL you can inspect or hand off.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Agents can pick up where others left off</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Agent A finishes and produces a result URL. Agent B reads that URL and continues the work. No message queue, no shared database.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Debugging built in</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">When something fails, the saved result includes the error and reason. Depending on where execution stopped, step detail may be partial. Agents use that result to retry or debug. You use it to understand what happened.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Shareable</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Every run saves a result at a URL. Send it to a teammate, attach it to a PR, or feed it to another agent.</p>
      </div>
    </div>
  </section>

  <!-- What agents build -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Patterns</h2>
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
    <div class="flex items-center gap-4 mt-1">
      <a href="/docs/patterns" class="inline-block text-[0.8125rem] text-(--accent) hover:underline font-medium">All 6 patterns →</a>
      <a href="/examples" class="inline-block text-[0.8125rem] text-(--text-3) hover:text-(--text) hover:underline">Browse runnable examples →</a>
    </div>
  </section>

  <!-- Get started -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Get started</h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      <a href="/tutorial" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Tutorial</div>
          <div class="text-[0.8125rem] text-(--text-2)">2 minutes to your first run</div>
        </div>
      </a>

      <a href="/docs" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Docs</div>
          <div class="text-[0.8125rem] text-(--text-2)">API, permissions, reference</div>
        </div>
      </a>

      <a href="/docs/self-host" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Self-host</div>
          <div class="text-[0.8125rem] text-(--text-2)">Your agents, your data</div>
        </div>
      </a>
    </div>
  </section>

  </div>
</div>
