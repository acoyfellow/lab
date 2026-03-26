<script lang="ts">
  import { goto } from '$app/navigation';
  import SEO from '$lib/SEO.svelte';
  import { jsonHealer } from '$lib/examples';
  import { apiRetry, webhookValidator, dataTransformer, multiSourceAggregator } from '$lib/examples/data/new-examples';
  import * as Table from '$lib/components/ui/table';
  import { Button } from '$lib/components/ui/button';
  import AppLink from '$lib/AppLink.svelte';

  const examples = [
    jsonHealer,
    apiRetry,
    webhookValidator,
    dataTransformer,
    multiSourceAggregator
  ];

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
            <Table.Row>
              <Table.Cell class="font-medium">
                <div class="space-y-1">
                  <div class="text-(--text)">{ex.title}</div>
                  <div class="text-[0.8125rem] text-(--text-2) sm:hidden">{ex.description}</div>
                </div>
              </Table.Cell>
              <Table.Cell class="hidden sm:table-cell text-(--text-2)">
                {ex.description}
              </Table.Cell>
              <Table.Cell class="text-end">
                <div class="inline-flex items-center gap-2">
                  <Button size="sm" onclick={() => goto(`/compose?example=${ex.id}`)}>Run</Button>
                  <AppLink
                    to={`/compose?example=${ex.id}`}
                    class="text-[0.75rem] text-(--accent) hover:underline"
                  >
                    Open →
                  </AppLink>
                </div>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  </section>

</div>
