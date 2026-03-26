<script lang="ts">
  import { goto } from '$app/navigation';
  import SEO from '$lib/SEO.svelte';
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
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';

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

  const startHereExamples = allExamples.filter((example) => example.startHere);
  const featuredExamples = allExamples.filter((example) => example.featured);

  const exampleSections: { label: string; examples: ExampleData[] }[] = [
    {
      label: 'Trace-first workflows',
      examples: [
        jsonHealer,
        iterativeRepair,
        traceHandoff,
        proofOfCorrectness,
        canaryRun,
        preflightCheck,
        zeroBleed,
        apiRetry,
        webhookValidator,
        dataTransformer,
        multiSourceAggregator
      ]
    },
    {
      label: 'Deterministic primitives',
      examples: [
        sort,
        dedupe,
        regexTest,
        dateMath,
        hash,
        validateJson,
        wordFrequency,
        mapFilterReduce,
        generateUuids,
        transformStrings
      ]
    },
    {
      label: 'Agentic patterns',
      examples: [
        selfImprovingLoop,
        computeOffload,
        coldBootSprint
      ]
    }
  ];

  function complexityLabel(ex: ExampleData): string {
    if (ex.complexity === 'simple') return '1 isolate';
    if (ex.complexity === 'agentic') return `${ex.steps.length} steps · agent pattern`;
    return `${ex.steps.length} steps · workflow`;
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
  description="Agent workflows, self-healing pipelines, and proof-of-work patterns — all runnable with traces."
  path="/examples"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8">
  <header class="mb-10">
    <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-(--text) mb-3">
      Examples
    </h1>
    <p class="text-[1.0625rem] text-(--text-2) max-w-[60ch]">
      Start with a trace-first workflow, open it in Compose, run it, then inspect the trace URL. The strongest examples show why the trace is the product.
    </p>
  </header>

  <section class="mb-12 space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Start here</h2>
        <p class="text-[0.875rem] text-(--text-2) mt-2 mb-0 max-w-[60ch]">
          These three examples explain the product fastest: repair something broken, hand work off with a trace, and prove the result.
        </p>
      </div>
      <div class="text-[0.75rem] text-(--text-3)">
        Opens in Compose, then run for a trace URL.
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      {#each startHereExamples as ex (ex.id)}
        <button
          type="button"
          class="text-left rounded-(--radius) border border-(--border) bg-(--surface) p-4 hover:border-(--accent) transition-colors"
          onclick={() => openExample(ex)}
        >
          <div class="flex items-center justify-between gap-2">
            <div class="font-semibold text-(--text) text-[0.9375rem]">{ex.title}</div>
            <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">Start here</span>
          </div>
          <p class="text-[0.8125rem] text-(--text-2) mt-2 mb-0">{ex.description}</p>
          <div class="flex flex-wrap gap-1 mt-3">
            <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{complexityLabel(ex)}</span>
            {#if ex.traceValue}
              <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">trace-first</span>
            {/if}
          </div>
          <p class="text-[0.75rem] text-(--text-2) mt-3 mb-0">{ex.traceValue}</p>
          <div class="mt-4 text-[0.75rem] text-(--accent)">Open in Compose →</div>
        </button>
      {/each}
    </div>
  </section>

  <section class="mb-12 space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Featured trace patterns</h2>
        <p class="text-[0.875rem] text-(--text-2) mt-2 mb-0 max-w-[60ch]">
          Pick a workflow where the trace changes the outcome: approval artifact, handoff layer, safety check, or debugging narrative.
        </p>
      </div>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      {#each featuredExamples as ex (ex.id)}
        <button
          type="button"
          class="text-left rounded-(--radius) border border-(--border) bg-(--surface) p-4 hover:border-(--accent) transition-colors"
          onclick={() => openExample(ex)}
        >
          <div class="flex items-center justify-between gap-2">
            <div class="font-semibold text-(--text)">{ex.title}</div>
            <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{complexityLabel(ex)}</span>
          </div>
          <p class="text-[0.8125rem] text-(--text-2) mt-2 mb-0">{ex.problem}</p>
          <p class="text-[0.75rem] text-(--text-2) mt-3 mb-0">{ex.traceValue ?? ex.result}</p>
          <div class="mt-4 text-[0.75rem] text-(--accent)">Open in Compose →</div>
        </button>
      {/each}
    </div>
  </section>

  {#each exampleSections as { label, examples }}
    <section class="mb-12 last:mb-0">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3) mb-4">
        {label}
      </h2>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface)">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Example</Table.Head>
              <Table.Head class="hidden sm:table-cell">Description</Table.Head>
              <Table.Head class="text-end">Open</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each examples as ex (ex.id)}
              <Table.Row class="hover:bg-(--surface-alt)">
                <Table.Cell class="font-medium cursor-pointer" onclick={() => openExample(ex)}>
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <div class="text-(--text)">{ex.title}</div>
                      {#if ex.startHere}
                        <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">Start here</span>
                      {/if}
                    </div>
                    <div class="sm:hidden space-y-1">
                      <div class="text-[0.8125rem] text-(--text-2)">{ex.description}</div>
                      <div class="flex flex-wrap gap-1">
                        <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{complexityLabel(ex)}</span>
                        {#each ex.tags.slice(0, 4) as tag (tag)}
                          <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{tag}</span>
                        {/each}
                      </div>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell class="hidden sm:table-cell text-(--text-2) cursor-pointer"
                onclick={() => openExample(ex)}
                >
                  <div class="space-y-1">
                    <div>{ex.description}</div>
                    <div class="text-[0.75rem] text-(--text-3)">{ex.traceValue ?? ex.result}</div>
                    <div class="flex flex-wrap gap-1">
                      <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{complexityLabel(ex)}</span>
                      {#each ex.tags.slice(0, 5) as tag (tag)}
                        <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{tag}</span>
                      {/each}
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell class="text-end">
                  <Button size="lg" onclick={() => openExample(ex)}>
                    Open in Compose
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    </section>
  {/each}

</div>
