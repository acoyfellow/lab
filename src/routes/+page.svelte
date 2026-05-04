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
  import FileCheck2Icon from '@lucide/svelte/icons/file-check-2';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import TerminalIcon from '@lucide/svelte/icons/terminal';

  const proofPoints = [
    { label: 'Repo state', value: 'local git + Cloudflare Artifacts' },
    { label: 'Execution', value: 'local shell today, more executors later' },
    { label: 'Evidence', value: 'input, logs, result, receipt' }
  ];

  const northStar = [
    {
      icon: GitBranchIcon,
      title: 'Resolve repo state',
      body: 'Run from a real working tree, including dirty snapshots and Artifacts repos.'
    },
    {
      icon: TerminalIcon,
      title: 'Execute the command',
      body: 'Commands run with explicit executor settings, timeout evidence, and durable logs.'
    },
    {
      icon: FileCheck2Icon,
      title: 'Save the receipt',
      body: 'Every run writes a versioned receipt another agent or reviewer can inspect.'
    }
  ];

  const primitives = [
    {
      label: 'Run',
      title: 'Execute the work',
      body: 'Code, chains, generated steps, and nested isolates run in Cloudflare V8 sandboxes.'
    },
    {
      label: 'Constrain',
      title: 'Name the powers',
      body: 'Every host touchpoint is an explicit capability. No capability means pure compute.'
    },
    {
      label: 'Record',
      title: 'Return the receipt',
      body: 'Sandbox runs, MCP calls, browser actions, checkpoints, and granted capabilities land at one URL.'
    },
    {
      label: 'Recover',
      title: 'Continue from proof',
      body: 'A failed receipt becomes diagnosis input. A finished receipt becomes another agent’s handoff.'
    }
  ];

  const receiptFields = [
    'exact code or prompt',
    'external tool actions',
    'capabilities granted',
    'step inputs and outputs',
    'errors and timings',
    'machine-readable JSON'
  ];

  const featuredExamples = [
    {
      title: 'Verified code work',
      badge: 'Pass',
      href: '/docs/patterns#prove-it',
      description: 'The agent writes code, runs cases, and hands you the saved evidence instead of a claim.'
    },
    {
      title: 'Self-healing retries',
      badge: 'Fix',
      href: '/docs/patterns#self-healing-loop',
      description: 'A failed run becomes the next input: error, context, patch, retry, and final receipt.'
    },
    {
      title: 'Agent handoff',
      badge: 'URL',
      href: '/docs/patterns#agent-handoff',
      description: 'The next agent opens the URL and continues from evidence, not chat memory.'
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
  title="Lab — Proof-carrying agent work"
  description="Run agent work against real repo state and keep the receipt: command, logs, result, and replayable evidence."
  path="/"
  type="website"
/>

<div class="">
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
      class="relative z-10 max-w-3xl mx-auto px-6 py-14 max-sm:px-4 sm:py-16 md:py-20 min-h-[min(58vh,560px)] flex flex-col justify-center"
    >
      <div class="space-y-6 max-w-170">
        <div class="flex items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
          <span class="inline-flex size-7 items-center justify-center rounded-(--radius) border border-(--border) bg-(--surface)/80">
            <ShieldCheckIcon class="size-3.5 text-(--text-2)" />
          </span>
          Lab
        </div>

        <div class="space-y-4">
          <h1 class="text-[2.25rem] sm:text-[3.2rem] font-semibold tracking-tight leading-[1.02] text-(--text) drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
            Proof-carrying agent work.
        </h1>

          <p class="text-[1.0625rem] sm:text-[1.1875rem] text-(--text-2) leading-relaxed max-w-[62ch]">
            Lab runs commands against real repo state and writes the durable evidence: input, logs, result, receipt.
            The next agent can continue from the proof. A human can review the same record.
          </p>
        </div>

        <div class="flex items-center gap-3 flex-wrap pt-1">
          <Button href="/compose" variant="default" size="lg">
            Create a receipt
            <ArrowRightIcon class="size-4" />
          </Button>
          <Button href="/docs/install" variant="outline" size="lg">Install Lab</Button>
          <code class="text-[0.8125rem] text-(--text-2) bg-(--surface)/75 px-2.5 py-1 rounded-md border border-(--border)">bun run demo:local-run</code>
        </div>

        <div class="grid gap-2 sm:grid-cols-3 pt-2 max-w-180">
          {#each proofPoints as point}
            <div class="border-l border-(--border) pl-3">
              <div class="text-[0.6875rem] uppercase tracking-wider font-semibold text-(--text-3)">{point.label}</div>
              <div class="text-[0.8125rem] leading-snug text-(--text-2)">{point.value}</div>
            </div>
          {/each}
        </div>
      </div>
    </header>
  </section>

  <div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-14">

  <section class="space-y-4">
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div class="space-y-1">
        <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">The spine</h2>
        <p class="text-[1rem] text-(--text) font-medium m-0">Repo state goes in. Evidence comes out.</p>
      </div>
      <code class="text-[0.75rem] text-(--text-3) bg-(--surface) border border-(--border) rounded-(--radius) px-2 py-1">repo -&gt; executor -&gt; receipt</code>
    </div>
    <div class="grid gap-3 sm:grid-cols-3">
      {#each northStar as item}
        {@const Icon = item.icon}
        <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-3">
          <div class="size-8 rounded-(--radius) border border-(--border) bg-(--surface-alt) flex items-center justify-center">
            <Icon class="size-4 text-(--text-2)" />
          </div>
          <div class="space-y-1">
            <h3 class="text-[0.9375rem] font-semibold text-(--text) m-0">{item.title}</h3>
            <p class="text-[0.8125rem] text-(--text-2) m-0 leading-relaxed">{item.body}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Product thesis + receipt shape -->
  <section class="space-y-4">
    <div class="border-l-2 border-(--accent) pl-5 space-y-2">
      <p class="text-[1.0625rem] text-(--text) leading-relaxed m-0 font-medium">
        AI agents are starting to do real work. The durable artifact should be the run record, not the chat summary.
      </p>
      <p class="text-[0.875rem] text-(--text-2) leading-relaxed m-0">
        Lab makes the receipt the unit of agent work: a canonical record at <code class="text-[0.8125rem]">/results/:id</code>, viewable by humans and fetchable as <code class="text-[0.8125rem]">.json</code> by agents.
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
        {@html data.codeHtml.receiptShape}
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 flex flex-col justify-between gap-4">
        <div class="space-y-2">
          <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">Receipt anatomy</h2>
          <p class="text-[0.875rem] text-(--text-2) m-0 leading-relaxed">
            One link carries enough context to audit, retry, fork, compare, or hand off the work.
          </p>
        </div>
        <ul class="grid gap-2 m-0 p-0 list-none">
          {#each receiptFields as field}
            <li class="flex items-center gap-2 text-[0.8125rem] text-(--text)">
              <span class="size-1.5 rounded-full bg-(--accent) shrink-0"></span>
              <span>{field}</span>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  </section>

  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">The loop</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      {#each primitives as primitive}
        <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">{primitive.label}</div>
          <h3 class="text-[0.9375rem] font-semibold text-(--text) m-0">{primitive.title}</h3>
          <p class="text-[0.8125rem] text-(--text-2) m-0 leading-relaxed">{primitive.body}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- First request: SDK + curl side by side -->
  <section class="space-y-3">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">How agents create receipts</h2>
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
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">Produce a real receipt</h2>

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
          <span class="text-[0.8125rem] font-semibold text-emerald-500">Receipt created</span>
          {#if result.resultId}
            <a href="/results/{result.resultId}" class="text-[0.8125rem] text-(--accent) hover:underline font-medium">
              Open the receipt
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
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">What receipts unlock</h2>
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
    <a href="/docs/patterns" class="inline-block text-[0.8125rem] text-(--accent) hover:underline font-medium mt-1">All patterns</a>
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
