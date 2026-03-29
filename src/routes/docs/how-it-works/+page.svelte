<script lang="ts">
  import DocsArticle from '$lib/DocsArticle.svelte';

  const sections = [
    {
      id: 'isolates',
      title: 'Isolates',
      content:
        "Each run executes in a fresh V8 isolate on Cloudflare's edge. Milliseconds to first instruction. No cold starts, no shared state between executions.",
    },
    {
      id: 'capabilities',
      title: 'Capabilities',
      content:
        'Explicit permissions. Code only gets kvRead, workersAi, spawn, r2Read, d1Read, durableObjectFetch, or containerHttp if you declare it. Least privilege by default.',
    },
    {
      id: 'traces',
      title: 'Traces',
      content:
        'Every run produces a saved result at a permanent URL (/t/:id). Successful runs include step-by-step inputs and outputs. Failed or aborted runs include the error and reason, but per-step detail may be partial. Share links. Inspect, fork, rerun.',
    },
    {
      id: 'chains',
      title: 'Chains',
      content:
        'Multi-step pipelines where each step runs in a new isolate. Pass data via input/output. Build complex workflows with simple, composable steps.',
    },
    {
      id: 'spawn',
      title: 'Spawn',
      content:
        'Launch parallel isolates from within an isolate. Great for fan-out operations. Each spawned isolate gets its own trace entry.',
    },
  ];

  const tocItems = [
    { id: 'overview', label: 'Overview' },
    ...sections.map((s) => ({ id: s.id, label: s.title })),
  ];
</script>

<DocsArticle
  pageTitle="How It Works"
  segment="How It Works"
  description="Lab execution model: isolates, capabilities, traces, chains, and spawn."
  {tocItems}
  mdDoc={false}
>
  <header id="overview" class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight">How It Works</h1>
    <p class="leading-relaxed">
      Lab's core concepts: execution model, security model, and observability.
    </p>
  </header>

  {#each sections as section}
    <section id={section.id} class="space-y-3">
      <h2 class="text-lg font-semibold text-(--text)">{section.title}</h2>
      <p class="leading-relaxed">
        {section.content}
      </p>
    </section>
  {/each}
</DocsArticle>
