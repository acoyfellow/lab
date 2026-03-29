<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  import MiniSandbox from '$lib/tutorial/MiniSandbox.svelte';
  import { Button } from '$lib/components/ui/button';
  import { version as appVersion } from '$app/environment';

  const featuredExamples = [
    {
      title: 'Code mode — but verified',
      badge: '10/10',
      href: '/docs/patterns#prove-it',
      description: 'Agent writes a function, generates edge cases, runs them all. The trace proves 10/10 pass. Ship the trace, not "trust me."'
    },
    {
      title: 'Self-healing pipeline',
      badge: 'Fix',
      href: '/docs/patterns#self-healing-loop',
      description: 'Step fails. Agent reads the trace, sees what broke, patches the code, reruns. Each attempt is a new trace. Watch it debug itself.'
    },
    {
      title: 'Agent-to-agent handoff',
      badge: 'URL',
      href: '/docs/patterns#agent-handoff',
      description: 'Agent A researches. Agent B synthesizes. Agent C delivers. One chain, one trace URL — that\'s the entire coordination protocol.'
    },
    {
      title: 'Canary deploy',
      badge: 'Diff',
      href: '/docs/patterns#canary-deploy',
      description: 'Old logic vs new logic, same inputs. The trace diffs the outputs. Review what changed before you ship.'
    }
  ];

  let { data }: PageProps = $props();
</script>

<SEO
  title="Lab — The feedback loop for AI agents"
  description="Agents write code. Lab runs it, traces what happened, and hands the result back. The same loop a developer uses — write, run, see, fix — except the agent does it."
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
          The feedback loop<br />
          <span class="text-(--text-2)">for AI agents.</span>
        </h1>

        <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
          An agent writes code. Lab runs it in a sandbox and returns a <strong class="text-(--text)">trace</strong> — a full record of what happened. The agent reads the trace, fixes what broke, and runs again. Same loop a developer uses, except the agent does it.
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
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Every run produces a trace</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Receipt, not assertion</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">The trace records every step's code, input, output, and timing. "I fixed the data" becomes a URL you can verify.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Handoff protocol</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Agent A produces a trace URL. Agent B reads it and picks up where A left off. The trace is the API.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Debugging built in</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">When a step fails, the trace shows exactly what input caused it. Agents read traces to self-heal. Humans read traces to understand.</p>
      </div>
      <div class="p-4 rounded-(--radius) border border-(--border) bg-(--surface)">
        <div class="font-semibold text-(--text) text-[0.875rem] mb-1">Shareable</div>
        <p class="text-[0.8125rem] text-(--text-2) m-0">Every trace is a permanent URL. Send it to a teammate, attach it to a PR, or feed it to another agent.</p>
      </div>
    </div>
  </section>

  <!-- Live demo -->
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Watch an agent heal broken data</h2>
    </div>
    <p class="text-[0.9375rem] text-(--text-2)">
      Four steps, four sandboxes. Each step's output flows to the next step's <code class="text-[0.8125rem]">input</code>. Hit Run, then open the trace.
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
    <div class="flex items-center gap-4 mt-1">
      <a href="/docs/patterns" class="inline-block text-[0.8125rem] text-(--accent) hover:underline font-medium">All 8 patterns →</a>
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
