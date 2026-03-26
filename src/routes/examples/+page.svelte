<script lang="ts">
  import { goto } from '$app/navigation';
  import SEO from '$lib/SEO.svelte';
  import ExampleCard from '$lib/examples/ExampleCard.svelte';
  import { jsonHealer } from '$lib/examples';
  import { apiRetry, webhookValidator, dataTransformer, multiSourceAggregator } from '$lib/examples/data/new-examples';

</script>

<SEO
  title="Examples — lab"
  description="Real-world examples of Lab in action."
  path="/examples"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8">
  <header class="mb-10">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-(--text) mb-3">
      Examples
    </h1>
    <p class="text-[1.0625rem] text-(--text-2) max-w-[60ch]">
      Real-world demos showing Lab's capabilities. Each example includes working code and execution traces.
    </p>
  </header>

  <section class="mb-12">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) mb-4">
      Runnable Examples
    </h2>
    <div class="grid gap-6 sm:grid-cols-2">
      <ExampleCard 
        data={jsonHealer} 
        variant="card" 
        onRun={() => goto('/compose?example=json-healer')}
      />
      <ExampleCard 
        data={apiRetry} 
        variant="card" 
        onRun={() => goto('/compose?example=api-retry')}
      />
      <ExampleCard 
        data={webhookValidator} 
        variant="card" 
        onRun={() => goto('/compose?example=webhook-validator')}
      />
      <ExampleCard 
        data={dataTransformer} 
        variant="card" 
        onRun={() => goto('/compose?example=data-transformer')}
      />
      <ExampleCard 
        data={multiSourceAggregator} 
        variant="card" 
        onRun={() => goto('/compose?example=multi-source-aggregator')}
      />
    </div>
  </section>

</div>
