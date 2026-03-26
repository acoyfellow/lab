<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  import MiniSandbox from '$lib/tutorial/MiniSandbox.svelte';
  import { Button } from '$lib/components/ui/button';

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
          v0.0.1 — early access
        </div>

        <h1 class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15] text-(--text) drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          Agents run code here.<br />
          <span class="text-(--text-2)">Every run leaves a trace.</span>
        </h1>

        <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
          An agent sends JavaScript. Lab runs each step in an <strong class="text-(--text)">isolated V8</strong> with only the capabilities you grant.
          Every run produces a permanent <strong class="text-(--text)">trace</strong> — the proof of what happened, shareable with agents and humans alike.
        </p>
        <div class="flex items-center gap-3 flex-wrap">
          <Button href="/compose" variant="default">Run a chain</Button>
          <a href="/examples" class="text-[0.8125rem] text-(--accent) hover:underline">see what agents build →</a>
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
        <p class="text-[0.8125rem] text-(--text-2) m-0">Run fails. Agent reads the trace, sees exactly what broke, patches the code, runs again. Each iteration is a new trace. Watch it debug itself.</p>
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
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">What agents build with this</h2>
    <div class="space-y-3">
      <a href="/examples" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center text-[0.6875rem] font-bold">G1</span>
          <div>
            <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.875rem]">Self-Improving Loop</div>
            <p class="text-[0.8125rem] text-(--text-2) m-0 mt-0.5">Two candidate implementations compete on the same test cases. Trigram vs Levenshtein, 8 fuzzy string matches. Winner selected by fitness. The trace is the lab notebook — one generation of an evolutionary agent loop.</p>
          </div>
        </div>
      </a>
      <a href="/examples" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[0.75rem] font-bold">10/10</span>
          <div>
            <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.875rem]">Proof of Correctness</div>
            <p class="text-[0.8125rem] text-(--text-2) m-0 mt-0.5">Agent writes a function, specifies 10 edge cases, runs them all in isolated steps. The trace shows 10/10 passing. Not "this should work" — here's the execution receipt.</p>
          </div>
        </div>
      </a>
      <a href="/examples" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="flex items-start gap-3">
          <span class="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[0.75rem]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <div>
            <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.875rem]">Zero Bleed</div>
            <p class="text-[0.8125rem] text-(--text-2) m-0 mt-0.5">Step 1 poisons every global and prototype. Step 2 is a fresh V8 — nothing leaks. The trace proves the isolation model. This is how agents run untrusted code safely.</p>
          </div>
        </div>
      </a>
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
