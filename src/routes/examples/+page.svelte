<script lang="ts">
  import { env } from '$env/dynamic/public';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import ExampleCard from '$lib/examples/ExampleCard.svelte';
  import { jsonHealer, invisibleKey, forbiddenDoor, immutableWitness } from '$lib/examples';
  import { paths } from '$lib/paths';

  const exampleId = $derived(env.PUBLIC_EXAMPLE_TRACE_ID ?? '');
  const showcaseExamples = [jsonHealer, invisibleKey, forbiddenDoor, immutableWitness];
</script>

<SEO
  title="Examples — lab"
  description="Real-world examples of Lab in action: JSON healing, security demos, and agent workflows."
  path="/examples"
  type="website"
/>

<div class="max-w-5xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8">
  <header class="mb-10">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-(--text) mb-3">
      Examples
    </h1>
    <p class="text-[1.0625rem] text-(--text-2) max-w-[60ch]">
      Real-world demos showing Lab's capabilities. Each example includes working code, 
      execution traces, and security patterns.
    </p>
  </header>

  <!-- Showcase Examples -->
  <section class="mb-12">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) mb-4">
      Showcase
    </h2>
    <div class="grid gap-6 sm:grid-cols-2">
      {#each showcaseExamples as example}
        <ExampleCard 
          data={example} 
          variant="card" 
          onRun={() => window.location.href = `/compose?example=${example.id}`}
        />
      {/each}
    </div>
  </section>

  <!-- Getting Started -->
  <section class="mb-12">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) mb-4">
      Getting Started
    </h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <AppLink
        to={paths.tutorial}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Tutorial</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Three pages, runners on 1–2, agent handoff on 3.</div>
      </AppLink>
      <AppLink
        to={paths.docsCapabilities}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Capabilities</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
          Each guest string, binding, <code class="font-mono text-[0.7rem]">/invoke/*</code> route, pros and caveats.
        </div>
      </AppLink>
      <AppLink
        to={paths.docs}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Docs</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">HTTP API, TypeScript client, architecture, trace schema.</div>
      </AppLink>
      <a
        href="/compose"
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Compose</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
          Build and run chains, sandbox, spawn, or KV read modes.
        </div>
      </a>
    </div>
  </section>

  <section class="mt-10 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem] text-(--text-2) leading-relaxed">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Curated example trace</div>
    {#if exampleId}
      <a href="/t/{exampleId}" class="text-(--text) font-mono text-xs underline underline-offset-2">/t/{exampleId}</a>
      <p class="mt-2 text-[0.75rem] text-(--text-3)">Set <code class="font-mono">PUBLIC_EXAMPLE_TRACE_ID</code> in deploy env to override.</p>
    {:else}
      <p>Run any mode in Compose, then bookmark the trace URL. Optionally set <code class="font-mono text-[0.75rem]">PUBLIC_EXAMPLE_TRACE_ID</code> in <code class="font-mono text-[0.75rem]">.env</code> for a stable demo link on this page.</p>
    {/if}
  </section>
</div>
