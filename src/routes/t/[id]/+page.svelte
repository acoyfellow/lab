<script lang="ts">
  import CollapsiblePre from '$lib/CollapsiblePre.svelte';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  type TraceRequest = {
    prompt?: string;
    code?: string;
    capabilities?: string[];
    depth?: number;
    steps?: Array<{ name?: string; code: string; capabilities: string[] }>;
  };

  type TraceRow = {
    step: number;
    name?: string;
    capabilities: string[];
    input: unknown;
    output: unknown;
    ms: number;
  };

  type TracePageData = {
    id: string;
    type: string;
    createdAt: string;
    request: TraceRequest;
    outcome: { ok: boolean; result?: unknown; error?: string; reason?: string };
    timing?: Record<string, number>;
    generated?: string;
    trace?: TraceRow[];
  };

  let { data } = $props();
  const trace = $derived(data.trace as TracePageData);

  const timingItems = $derived.by(() => {
    const t = trace.timing;
    const items: string[] = [];
    if (t?.totalMs !== undefined) items.push(`total ${t.totalMs} ms`);
    if (t?.generateMs !== undefined) items.push(`generate ${t.generateMs} ms`);
    if (t?.runMs !== undefined) items.push(`run ${t.runMs} ms`);
    return items;
  });

  function formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    return JSON.stringify(value, null, 2);
  }

  function outcomeText(): string {
    if (!trace.outcome.ok) {
      return trace.outcome.reason
        ? `${trace.outcome.error}\nreason: ${trace.outcome.reason}`
        : trace.outcome.error ?? 'Unknown error';
    }
    return formatValue(trace.outcome.result);
  }

  const outcomeCompact = $derived(trace.outcome.ok && outcomeText().length <= 240);

  const outcomeSummary = $derived.by(() => {
    if (trace.outcome.ok) return 'ok — result below.';
    const err = trace.outcome.error ?? 'unknown';
    return err.length > 160 ? `${err.slice(0, 160)}…` : err;
  });

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
  }

  function forkPayload(): Record<string, unknown> {
    const r = trace.request;
    const base: Record<string, unknown> = { mode: trace.type };
    if (r.code) base.code = r.code;
    if (r.prompt) base.prompt = r.prompt;
    if (Array.isArray(r.capabilities)) base.capabilities = r.capabilities;
    if (r.depth !== undefined) base.depth = r.depth;
    if (r.steps?.length) base.steps = r.steps;
    return base;
  }

  function goFork() {
    try {
      sessionStorage.setItem('lab-fork', JSON.stringify(forkPayload()));
    } catch {
      return;
    }
    window.location.href = '/compose';
  }
</script>

<svelte:head>
  <title>trace {trace.id} - lab</title>
</svelte:head>

<div class="max-w-[860px] mx-auto px-5 py-8 pb-12">
  <header class="flex justify-between items-start gap-4 mb-6 max-sm:flex-col">
    <div>
      <h1 class="text-lg font-semibold tracking-tight">{trace.type} trace</h1>
      <div class="text-(--text-3) text-[0.8125rem] mt-0.5">id {trace.id} &middot; {trace.createdAt}</div>
    </div>
    <div class="flex gap-3 flex-wrap text-[0.8125rem]">
      <a href="/compose" class="text-(--text-2) no-underline bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 hover:text-(--text)">Compose</a>
      <button
        type="button"
        onclick={goFork}
        class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) text-[0.8125rem] font-(family-name:--sans)"
      >Fork</button>
      <a href="/t/{trace.id}.json" class="text-(--text-2) no-underline bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 hover:text-(--text)">JSON</a>
      <button type="button" onclick={copyUrl} class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) text-[0.8125rem] font-(family-name:--sans)">Copy URL</button>
    </div>
  </header>

  <section
    class="mb-6 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem] text-(--text-2) leading-relaxed"
  >
    <p class="m-0">
      <strong class="text-(--text) font-medium">Mode</strong>
      <code class="font-(family-name:--mono) text-[0.75rem]">{trace.type}</code>
      &middot;
      <strong class="text-(--text) font-medium">Outcome</strong>
      {#if trace.outcome.ok}
        <span class="text-(--text)">{outcomeSummary}</span>
      {:else}
        <span class="text-(--cap-off-text)">{outcomeSummary}</span>
      {/if}
    </p>
    <p class="mt-2 mb-0">
      <strong class="text-(--text) font-medium">Fork</strong>
      copies this run into Compose (edit and run again).
      <AppLink to={paths.docsHttpApi} class="text-(--text-3) underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
      &middot;
      <AppLink to={paths.docsTraceSchema} class="text-(--text-3) underline underline-offset-2 hover:text-(--text)">Trace schema</AppLink>.
    </p>
  </section>

  {#if trace.type === 'kv'}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mb-3.5 text-[0.8125rem] text-(--text-2) leading-relaxed">
      <strong class="text-(--text) font-medium">KV read</strong> uses a <strong class="text-(--text) font-medium">point-in-time snapshot</strong> of KV loaded before your isolate started. The isolate calls <code class="font-(family-name:--mono) text-[0.75rem]">kv.get</code> / <code class="font-(family-name:--mono) text-[0.75rem]">kv.list</code> against that in-memory copy, not live KV.
    </section>
  {/if}

  {#if trace.type === 'spawn'}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mb-3.5 text-[0.8125rem] text-(--text-2) leading-relaxed">
      <strong class="text-(--text) font-medium">Spawn</strong>: one parent isolate ran with max depth <code class="font-(family-name:--mono) text-[0.75rem]">{trace.request.depth ?? 2}</code> (server default 2 if omitted). Child isolates are <strong class="text-(--text) font-medium">not</strong> persisted as separate traces; the result below is the parent&rsquo;s return value (children may appear nested inside it).
    </section>
  {/if}

  {#if trace.request.prompt}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Prompt</div>
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{trace.request.prompt}</pre>
    </section>
  {/if}

  {#if trace.request.code}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Code</div>
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{trace.request.code}</pre>
    </section>
  {/if}

  {#if trace.request.capabilities?.length}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Capabilities</div>
      <div class="flex gap-1.5 flex-wrap">
        {#each trace.request.capabilities as cap}
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-on-bg) text-(--cap-on-text) border border-(--cap-on-border)">{cap}</span>
        {/each}
      </div>
    </section>
  {/if}

  {#if trace.request.steps?.length}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Steps</div>
      <div class="grid gap-3">
        {#each trace.request.steps as step, idx}
          <div class="bg-(--surface-alt) rounded-(--radius) p-3">
            <div class="font-semibold text-[0.8125rem]">{step.name ?? `Step ${idx + 1}`}</div>
            <div class="flex gap-1.5 flex-wrap mt-1.5">
              {#if step.capabilities.length > 0}
                {#each step.capabilities as cap}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-on-bg) text-(--cap-on-text) border border-(--cap-on-border)">{cap}</span>
                {/each}
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-off-bg) text-(--cap-off-text) border border-(--cap-off-border)">none</span>
              {/if}
            </div>
            <pre class="bg-(--surface) rounded-(--radius) p-3 mt-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{step.code}</pre>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if trace.generated}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Generated code</div>
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{trace.generated}</pre>
    </section>
  {/if}

  <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">
      {trace.outcome.ok ? 'Result' : 'Error'}
    </div>
    {#if outcomeCompact}
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{outcomeText()}</pre>
    {:else}
      <CollapsiblePre label="Full output" text={outcomeText()} defaultOpen={!trace.outcome.ok} />
    {/if}
  </section>

  {#if timingItems.length > 0}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Timing</div>
      <div class="text-(--text-2) text-[0.8125rem]">{timingItems.join(' \u00b7 ')}</div>
    </section>
  {/if}

  {#if trace.trace?.length}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Execution trace</div>
      <div class="grid gap-3">
        {#each trace.trace as entry}
          <div class="bg-(--surface-alt) rounded-(--radius) p-3">
            <div class="flex justify-between items-center gap-3 mb-2">
              <div class="font-semibold text-[0.8125rem]">{entry.name ?? `Step ${entry.step + 1}`}</div>
              <div class="text-(--text-3) font-(family-name:--mono) text-xs">{entry.ms} ms</div>
            </div>
            <div class="flex gap-1.5 flex-wrap mb-2">
              {#if entry.capabilities.length > 0}
                {#each entry.capabilities as cap}
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-on-bg) text-(--cap-on-text) border border-(--cap-on-border)">{cap}</span>
                {/each}
              {:else}
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-off-bg) text-(--cap-off-text) border border-(--cap-off-border)">none</span>
              {/if}
            </div>
            <div class="grid gap-3 grid-cols-2 mt-3 max-sm:grid-cols-1">
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Input</div>
                {#if formatValue(entry.input).length <= 180}
                  <pre class="bg-(--surface) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{formatValue(entry.input)}</pre>
                {:else}
                  <CollapsiblePre label="Input JSON" text={formatValue(entry.input)} defaultOpen={false} />
                {/if}
              </div>
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Output</div>
                {#if formatValue(entry.output).length <= 180}
                  <pre class="bg-(--surface) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{formatValue(entry.output)}</pre>
                {:else}
                  <CollapsiblePre label="Output JSON" text={formatValue(entry.output)} defaultOpen={false} />
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
