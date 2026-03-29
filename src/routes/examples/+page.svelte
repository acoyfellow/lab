<script lang="ts">
  import { goto } from '$app/navigation';
  import SEO from '$lib/SEO.svelte';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';
  import {
    jsonHealer,
    apiRetry,
    webhookValidator,
    dataTransformer,
    multiSourceAggregator,
    sort,
    dedupe,
    regexTest,
    dateMath,
    hash,
    validateJson,
    wordFrequency,
    mapFilterReduce,
    generateUuids,
    transformStrings,
    proofOfCorrectness,
    canaryRun,
    zeroBleed,
    computeOffload,
    preflightCheck,
    coldBootSprint,
    traceHandoff,
    iterativeRepair,
    selfImprovingLoop
  } from '$lib/examples';
  import { COMPOSE_FORK_STEPS, type RunnableExampleId } from '$lib/examples/compose-fork-steps';
  import type { ExampleData } from '$lib/examples/types';

  let query = $state('');
  const normalizedQuery = $derived(() => query.trim().toLowerCase());

  const allExamples = [
    jsonHealer,
    apiRetry,
    webhookValidator,
    dataTransformer,
    multiSourceAggregator,
    sort,
    dedupe,
    regexTest,
    dateMath,
    hash,
    validateJson,
    wordFrequency,
    mapFilterReduce,
    generateUuids,
    transformStrings,
    proofOfCorrectness,
    canaryRun,
    zeroBleed,
    computeOffload,
    preflightCheck,
    coldBootSprint,
    traceHandoff,
    iterativeRepair,
    selfImprovingLoop
  ];

  type SortKey = 'score' | 'title' | 'steps';
  let sortKey = $state<SortKey>('score');
  let sortDir = $state<'asc' | 'desc'>('desc');

  function exampleScore(ex: ExampleData): number {
    const steps = ex.steps.length;
    const agenticBoost = ex.complexity === 'agentic' ? 50 : 0;
    const featuredBoost = ex.featured ? 40 : 0;
    const startHereBoost = ex.startHere ? 15 : 0;
    const traceBoost = ex.traceValue ? 8 : 0;
    return agenticBoost + featuredBoost + startHereBoost + traceBoost + steps;
  }

  const filteredAll = $derived(() => {
    const q = normalizedQuery();
    if (!q) return allExamples;
    return allExamples.filter((ex) => {
      const hay = [
        ex.title,
        ex.description,
        ex.problem,
        ex.result,
        ex.traceValue,
        ...(ex.tags ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  });

  const top6 = $derived(() =>
    [...filteredAll()]
      .sort((a, b) => exampleScore(b) - exampleScore(a))
      .slice(0, 6)
  );

  const restRows = $derived(() => {
    const topIds = new Set(top6().map((e) => e.id));
    const rows = filteredAll().filter((e) => !topIds.has(e.id));

    const dir = sortDir === 'asc' ? 1 : -1;
    const cmp = (a: ExampleData, b: ExampleData) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortKey === 'steps') return (a.steps.length - b.steps.length) * dir;
      return (exampleScore(a) - exampleScore(b)) * dir;
    };

    return [...rows].sort(cmp);
  });

  function complexityLabel(ex: ExampleData): string {
    if (ex.complexity === 'simple') return '1 isolate';
    if (ex.complexity === 'agentic') return `${ex.steps.length} steps · agent pattern`;
    return `${ex.steps.length} steps · workflow`;
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      return;
    }
    sortKey = nextKey;
    sortDir = nextKey === 'title' ? 'asc' : 'desc';
  }

  function openExample(ex: ExampleData) {
    const steps = COMPOSE_FORK_STEPS[ex.id as RunnableExampleId];
    if (steps === undefined) throw new Error(`No compose fork for example id: ${ex.id}`);
    sessionStorage.setItem(
      'lab-fork',
      JSON.stringify({ mode: 'chain', steps })
    );
    goto('/compose');
  }

</script>

<SEO
  title="Examples — lab"
  description="Runnable workflows for agents: open in Compose, run a chain, and share the saved result URL."
  path="/examples"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8">
  <header class="mb-10">
    <h1 class="text-2xl font-semibold tracking-tight text-(--text) mb-3">
      Examples
    </h1>
    <p class="text-[1.0625rem] text-(--text-2) max-w-[60ch]">
      Pick a workflow, open it in Compose, run it, and follow the trace.
    </p>
    <div class="mt-6">
      <input
        class="w-full rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-[0.9375rem] text-(--text) placeholder:text-(--text-3) focus:outline-none focus:border-(--accent)"
        placeholder="Search by title or description…"
        bind:value={query}
      />
      {#if normalizedQuery()}
        <div class="mt-2 text-[0.75rem] text-(--text-3)">
          Showing matches for “{query.trim()}”.
        </div>
      {/if}
    </div>
  </header>

  <section class="mb-12 space-y-4">
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
          Signature workflows
        </h2>
        <p class="text-[0.875rem] text-(--text-2) mt-2 mb-0 max-w-[70ch]">
          Multi-step pipelines, handoffs, safety checks, and proof artifacts.
        </p>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      {#each top6() as ex (ex.id)}
        <button
          type="button"
          class="text-left rounded-(--radius) border border-(--border) bg-(--surface) p-4 hover:border-(--accent) transition-colors"
          onclick={() => openExample(ex)}
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="font-semibold text-(--text)">{ex.title}</div>
              <div class="text-[0.8125rem] text-(--text-2) mt-2">
                {ex.problem ?? ex.description}
              </div>
            </div>
            <div class="shrink-0 text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">
              {complexityLabel(ex)}
            </div>
          </div>
          <div class="flex flex-wrap gap-1 mt-3">
            {#if ex.featured}
              <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">
                Featured
              </span>
            {/if}
            {#if ex.startHere}
              <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">
                Start here
              </span>
            {/if}
          </div>
          <div class="text-[0.75rem] text-(--text-3) mt-3">
            {ex.traceValue ?? ex.result}
          </div>
          <div class="mt-4 text-[0.75rem] text-(--accent)">Open in Compose →</div>
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-0 space-y-4">
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
          All examples
        </h2>
        <p class="text-[0.875rem] text-(--text-2) mt-2 mb-0 max-w-[70ch]">
          The full catalog. Search filters both sections.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button size="sm" variant="outline" onclick={() => toggleSort('steps')}>
          Sort: Steps {sortKey === 'steps' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </Button>
        <Button size="sm" variant="outline" onclick={() => toggleSort('title')}>
          Sort: Title {sortKey === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
        </Button>
      </div>
    </div>

    <div class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-[42%]">Example</Table.Head>
            <Table.Head class="hidden sm:table-cell w-[18%]">Complexity</Table.Head>
            <Table.Head class="text-end w-[1%] whitespace-nowrap">Open</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each restRows() as ex (ex.id)}
            <Table.Row class="hover:bg-(--surface-alt)">
              <Table.Cell class="align-top">
                <div class="space-y-1">
                  <div class="font-medium text-(--text)">{ex.title}</div>
                  <div class="text-[0.8125rem] text-(--text-2)">
                    {ex.description}
                  </div>
                  <div class="text-[0.75rem] text-(--text-3)">
                    {ex.traceValue ?? ex.result}
                  </div>
                </div>
              </Table.Cell>
              <Table.Cell class="hidden sm:table-cell align-top text-(--text-2)">
                {complexityLabel(ex)}
              </Table.Cell>
              <Table.Cell class="text-end align-top">
                <Button size="sm" onclick={() => openExample(ex)}>
                  Compose
                </Button>
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell class="h-20 text-(--text-2)">No matches.</Table.Cell>
              <Table.Cell class="hidden sm:table-cell" />
              <Table.Cell />
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </section>

</div>
