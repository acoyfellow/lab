<script lang="ts">
  import SEO from '$lib/SEO.svelte';
  
  const sections = [
    {
      id: 'isolates',
      title: 'Isolates',
      content: 'Each run executes in a fresh V8 isolate on Cloudflare\'s edge. Milliseconds to first instruction. No cold starts, no shared state between executions.'
    },
    {
      id: 'capabilities',
      title: 'Capabilities',
      content: 'Explicit permissions. Code only gets kvRead, workersAi, spawn, r2Read, d1Read, durableObjectFetch, or containerHttp if you declare it. Least privilege by default.'
    },
    {
      id: 'traces',
      title: 'Traces',
      content: 'Every run produces a durable trace with step-by-step inputs and outputs. Share /t/:id links. Inspect, fork, rerun. Perfect for debugging and auditing agent behavior.'
    },
    {
      id: 'chains',
      title: 'Chains',
      content: 'Multi-step pipelines where each step runs in a new isolate. Pass data via input/output. Build complex workflows with simple, composable steps.'
    },
    {
      id: 'spawn',
      title: 'Spawn',
      content: 'Launch parallel isolates from within an isolate. Great for fan-out operations. Each spawned isolate gets its own trace entry.'
    }
  ];
</script>

<SEO
  title="How It Works — lab"
  description="Understanding Lab's architecture: isolates, capabilities, traces, chains, and spawn."
  path="/docs/how-it-works"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-8">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight">How It Works</h1>
    <p class="text-[0.9375rem] text-(--text-2)">
      Lab's core concepts: execution model, security model, and observability.
    </p>
  </header>

  {#each sections as section}
    <section id={section.id} class="space-y-3">
      <h2 class="text-lg font-semibold text-(--text)">{section.title}</h2>
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
        {section.content}
      </p>
    </section>
  {/each}

  <div class="pt-8 border-t border-(--border)">
    <a href="/docs" class="text-[0.8125rem] text-(--accent) hover:underline">← Back to Documentation</a>
  </div>
</div>