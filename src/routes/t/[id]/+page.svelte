<script lang="ts">
  import { page } from '$app/state';

  let { data } = $props();
  const trace = data.trace;

  function formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    return JSON.stringify(value, null, 2);
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
  }

  const timingItems: string[] = [];
  if (trace.timing?.totalMs !== undefined) timingItems.push(`total ${trace.timing.totalMs} ms`);
  if (trace.timing?.generateMs !== undefined) timingItems.push(`generate ${trace.timing.generateMs} ms`);
  if (trace.timing?.runMs !== undefined) timingItems.push(`run ${trace.timing.runMs} ms`);
</script>

<svelte:head>
  <title>trace {trace.id} - lab</title>
</svelte:head>

<div class="max-w-[860px] mx-auto px-5 py-8 pb-12">
  <!-- Header -->
  <header class="flex justify-between items-start gap-4 mb-6 max-sm:flex-col">
    <div>
      <h1 class="text-lg font-semibold tracking-tight">{trace.type} trace</h1>
      <div class="text-[color:var(--text-3)] text-[0.8125rem] mt-0.5">id {trace.id} &middot; {trace.createdAt}</div>
    </div>
    <div class="flex gap-3 flex-wrap text-[0.8125rem]">
      <a href="/" class="text-[color:var(--text-2)] no-underline bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] px-3 py-1.5 hover:text-[color:var(--text)]">Back</a>
      <a href="/t/{trace.id}.json" class="text-[color:var(--text-2)] no-underline bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] px-3 py-1.5 hover:text-[color:var(--text)]">JSON</a>
      <button onclick={copyUrl} class="text-[color:var(--text-2)] bg-[color:var(--surface)] border border-[color:var(--border)] rounded-[var(--radius)] px-3 py-1.5 cursor-pointer hover:text-[color:var(--text)] text-[0.8125rem] font-[family-name:var(--sans)]">Copy URL</button>
    </div>
  </header>

  <!-- Request details -->
  {#if trace.request.prompt}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Prompt</div>
      <pre class="bg-[color:var(--surface-alt)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{trace.request.prompt}</pre>
    </section>
  {/if}

  {#if trace.request.code}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Code</div>
      <pre class="bg-[color:var(--surface-alt)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{trace.request.code}</pre>
    </section>
  {/if}

  {#if trace.request.capabilities?.length}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Capabilities</div>
      <div class="flex gap-1.5 flex-wrap">
        {#each trace.request.capabilities as cap}
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-on-bg)] text-[color:var(--cap-on-text)] border border-[color:var(--cap-on-border)]">{cap}</span>
        {/each}
      </div>
    </section>
  {/if}

  {#if trace.request.steps?.length}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Steps</div>
      <div class="grid gap-3">
        {#each trace.request.steps as step, idx}
          <div class="bg-[color:var(--surface-alt)] rounded-[var(--radius)] p-3">
            <div class="font-semibold text-[0.8125rem]">{step.name ?? `Step ${idx + 1}`}</div>
            <div class="flex gap-1.5 flex-wrap mt-1.5">
              {#if step.capabilities.length > 0}
                {#each step.capabilities as cap}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-on-bg)] text-[color:var(--cap-on-text)] border border-[color:var(--cap-on-border)]">{cap}</span>
                {/each}
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-off-bg)] text-[color:var(--cap-off-text)] border border-[color:var(--cap-off-border)]">none</span>
              {/if}
            </div>
            <pre class="bg-[color:var(--surface)] rounded-[var(--radius)] p-3 mt-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{step.code}</pre>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if trace.generated}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Generated code</div>
      <pre class="bg-[color:var(--surface-alt)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{trace.generated}</pre>
    </section>
  {/if}

  <!-- Outcome -->
  <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">
      {trace.outcome.ok ? 'Result' : 'Error'}
    </div>
    <pre class="bg-[color:var(--surface-alt)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{trace.outcome.ok
      ? formatValue(trace.outcome.result)
      : trace.outcome.reason
        ? `${trace.outcome.error}\nreason: ${trace.outcome.reason}`
        : trace.outcome.error ?? 'Unknown error'}</pre>
  </section>

  <!-- Timing -->
  {#if timingItems.length > 0}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Timing</div>
      <div class="text-[color:var(--text-2)] text-[0.8125rem]">{timingItems.join(' \u00b7 ')}</div>
    </section>
  {/if}

  <!-- Execution trace -->
  {#if trace.trace?.length}
    <section class="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Execution trace</div>
      <div class="grid gap-3">
        {#each trace.trace as entry}
          <div class="bg-[color:var(--surface-alt)] rounded-[var(--radius)] p-3">
            <div class="flex justify-between items-center gap-3 mb-2">
              <div class="font-semibold text-[0.8125rem]">{entry.name ?? `Step ${entry.step + 1}`}</div>
              <div class="text-[color:var(--text-3)] font-[family-name:var(--mono)] text-xs">{entry.ms} ms</div>
            </div>
            <div class="flex gap-1.5 flex-wrap mb-2">
              {#if entry.capabilities.length > 0}
                {#each entry.capabilities as cap}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-on-bg)] text-[color:var(--cap-on-text)] border border-[color:var(--cap-on-border)]">{cap}</span>
                {/each}
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-[color:var(--cap-off-bg)] text-[color:var(--cap-off-text)] border border-[color:var(--cap-off-border)]">none</span>
              {/if}
            </div>
            <div class="grid gap-3 grid-cols-2 mt-3 max-sm:grid-cols-1">
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Input</div>
                <pre class="bg-[color:var(--surface)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{formatValue(entry.input)}</pre>
              </div>
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-[color:var(--text-3)] mb-2">Output</div>
                <pre class="bg-[color:var(--surface)] rounded-[var(--radius)] p-3 font-[family-name:var(--mono)] text-xs whitespace-pre-wrap overflow-x-auto">{formatValue(entry.output)}</pre>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
