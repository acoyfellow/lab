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
    coldBootSprint
  } from '$lib/examples';
  import { COMPOSE_FORK_STEPS, type RunnableExampleId } from '$lib/examples/compose-fork-steps';
  import type { ExampleData } from '$lib/examples/types';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';

  const exampleSections: { label: string; examples: ExampleData[] }[] = [
    {
      label: 'Real-world',
      examples: [
        jsonHealer,
        apiRetry,
        webhookValidator,
        dataTransformer,
        multiSourceAggregator
      ]
    },
    {
      label: 'Algorithms & utilities',
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
      label: 'Agentic',
      examples: [
        proofOfCorrectness,
        canaryRun,
        zeroBleed,
        computeOffload,
        preflightCheck,
        coldBootSprint
      ]
    }
  ];

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
              <Table.Head class="text-end">Run</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each examples as ex (ex.id)}
              <Table.Row class="hover:bg-(--surface-alt)">
                <Table.Cell class="font-medium cursor-pointer" onclick={() => openExample(ex)}>
                  <div class="space-y-1">
                    <div class="text-(--text)">{ex.title}</div>
                    <div class="sm:hidden space-y-1">
                      <div class="text-[0.8125rem] text-(--text-2)">{ex.description}</div>
                      <div class="flex flex-wrap gap-1">
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
                    <div class="flex flex-wrap gap-1">
                      {#each ex.tags.slice(0, 5) as tag (tag)}
                        <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3) border border-(--border)">{tag}</span>
                      {/each}
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell class="text-end">
                  <Button size="lg" onclick={() => openExample(ex)}>
                    →
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
