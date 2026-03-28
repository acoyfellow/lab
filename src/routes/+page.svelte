<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  import MiniSandbox from '$lib/tutorial/MiniSandbox.svelte';
  import { Button } from '$lib/components/ui/button';
  import { version } from '../../package.json';

  const featuredExamples = [
    {
      title: 'Adaptive Opponent',
      badge: 'Loop',
      href: '/experiments/versus',
      description: 'AI plays Connect 4 with deterministic tactics. Losses produce traced insights that feed the next game. No prompt engineering — the system learns through composition.'
    },
    {
      title: 'Trace Handoff',
      badge: 'URL',
      href: '/examples',
      description: 'Agent A produces a trace URL. Agent B reads it and continues the work. The trace becomes the handoff protocol.'
    },
    {
      title: 'Proof of Correctness',
      badge: '10/10',
      href: '/examples',
      description: 'Agent writes a function, specifies edge cases, runs them all in isolated steps, and returns the trace as the execution receipt.'
    },
    {
      title: 'Canary Run',
      badge: 'Diff',
      href: '/examples',
      description: 'Old logic and new logic run on the same inputs. The trace shows exactly what changed before you ship.'
    }
  ];

  let { data }: PageProps = $props();
</script>

<SEO
  title="Lab — Isolated execution and traces for AI agents"
  description="Agents send code. Lab runs each step in an isolated V8. Every run produces a trace — a permanent artifact that proves what happened."
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
          v{version} — experimental (here be dragons)
        </div>

        <h1 class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15] text-(--text) drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          Run code in isolation.<br />
          <span class="text-(--text-2)">Trace what happened.</span>
        </h1>

        <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
          An agent sends JavaScript. Lab runs each step in an <strong class="text-(--text)">isolated V8</strong> — sandboxed, capability-scoped, edge-deployed.
          Every run produces a permanent <strong class="text-(--text)">trace</strong> — the proof of what happened, shareable with agents and humans alike.
        </p>
        <div class="flex items-center gap-3 flex-wrap">
          <Button href="/compose" variant="default">Open Compose</Button>
          <a href="/examples" class="text-[0.8125rem] text-(--accent) hover:underline">browse example chains →</a>
        </div>
      </div>
    </header>
  </section>

  <div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-12">

  <!-- Why traces matter -->
  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Why traces</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Proof, not claims</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">An agent says "I fixed the data." The trace shows every step — what it received, what it returned, what failed. It's a receipt.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Agent-to-agent handoff</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Agent A produces a trace URL. Agent B reads it and continues the work. No shared database, no custom API — just a URL.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Self-healing loops</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Run fails. Agent reads the trace, sees exactly what broke, patches the code, runs again. Each iteration is a new trace — the system fixes itself.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Follow the story</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Share a trace URL with a human. They can follow exactly what happened without needing the agent's context. It's a narrative, not a log.</p>
      </div>
    </div>
  </section>

  <!-- Live demo -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Watch an agent heal broken data</h2>
    </div>
    <p class="text-[0.9375rem] text-(--text-2)">
      Four isolates. Step 1 loads broken JSON. Step 2 tries to parse it and fails. Step 3 diagnoses and repairs. Step 4 validates. Hit Run, then open the trace to follow the full story.
    </p>
    <MiniSandbox />
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
    <a href="/examples" class="inline-block text-[0.8125rem] text-(--accent) hover:underline mt-1">See all examples →</a>
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
          <div class="text-[0.8125rem] text-(--text-2)">5 minutes to your first trace</div>
        </div>
      </a>

      <a href="/docs" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Docs</div>
          <div class="text-[0.8125rem] text-(--text-2)">API, capabilities, trace schema</div>
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
