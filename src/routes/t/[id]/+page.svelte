<script lang="ts">
  import CollapsiblePre from '$lib/CollapsiblePre.svelte';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  type TraceRequest = {
    template?: string;
    body?: string;
    prompt?: string;
    code?: string;
    capabilities?: string[];
    depth?: number;
    steps?: Array<{
      name?: string;
      template?: string;
      body?: string;
      code?: string;
      capabilities: string[];
      props?: unknown;
      input?: unknown;
    }>;
  };

  type TraceRow = {
    step: number;
    name?: string;
    template?: string;
    body?: string;
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
    const guestBody = r.body ?? r.code;
    if (guestBody) base.body = guestBody;
    if (r.template) base.template = r.template;
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
  <title>Run {trace.id} — lab</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-5 py-8 pb-12">
  <header class="flex justify-between items-start gap-4 mb-6 max-sm:flex-col">
    <div>
      <h1 class="text-lg font-semibold tracking-tight text-(--text)">Lab run</h1>
      <p class="text-(--text-2) text-[0.8125rem] mt-1 mb-0 max-w-[52ch] leading-relaxed">
        <strong class="text-(--text) font-medium">{trace.type}</strong> —
        {#if trace.type === 'chain'}
          several isolates ran in order; scroll to <strong class="text-(--text) font-medium">Step-by-step</strong> to see each
          one.
        {:else if trace.type === 'sandbox' || trace.type === 'kv'}
          one isolate ran your guest code.
        {:else if trace.type === 'spawn'}
          a parent isolate called <code class="text-[0.75rem]">spawn</code> (see mode note below).
        {:else if trace.type === 'generate'}
          the host generated code, then ran it.
        {:else}
          Worker recorded this request and outcome.
        {/if}
      </p>
      <div class="text-(--text-3) text-[0.75rem] mt-2 font-(family-name:--mono)">{trace.id}</div>
      <div class="text-(--text-3) text-[0.8125rem] mt-0.5">{trace.createdAt}</div>
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
    class="mb-6 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem] text-(--text-2) leading-relaxed space-y-3"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span
        class="inline-flex items-center px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold uppercase tracking-wide border {trace.outcome.ok
          ? 'bg-(--cap-on-bg) text-(--cap-on-text) border-(--cap-on-border)'
          : 'bg-(--cap-off-bg) text-(--cap-off-text) border-(--cap-off-border)'}"
      >
        {trace.outcome.ok ? 'Succeeded' : 'Failed'}
      </span>
      <span><strong class="text-(--text) font-medium">Mode</strong> <code class="text-[0.75rem]">{trace.type}</code></span>
    </div>
    {#if !trace.outcome.ok}
      <p class="m-0 text-(--cap-off-text) text-[0.8125rem]">{outcomeSummary}</p>
    {/if}
    <p class="m-0 text-(--text-3) text-[0.75rem]">
      <strong class="text-(--text-2) font-medium">How to read this page:</strong> summary (here) &rarr; what you submitted
      &rarr; final result &rarr;
      {#if trace.trace?.length}
        step-by-step isolates.
      {:else}
        (no per-step log for this run).
      {/if}
      <AppLink to={paths.tutorialStep1} class="text-(--text-2) underline underline-offset-2 hover:text-(--text)"
        >Tutorial</AppLink>
      &middot;
      <AppLink to={paths.docsTraceSchema} class="underline underline-offset-2 hover:text-(--text)">Schema</AppLink>.
    </p>
    <p class="m-0">
      <strong class="text-(--text) font-medium">Fork</strong> opens Compose with this request so you can edit and re-run.
      <AppLink to={paths.docsHttpApi} class="text-(--text-3) underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>.
    </p>
  </section>

  {#if trace.type === 'chain'}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mb-3.5 text-[0.8125rem] text-(--text-2) leading-relaxed">
      <strong class="text-(--text) font-medium">Chain</strong> runs one isolate per step. The return value of step
      <em>n</em> is passed as <code class="font-(family-name:--mono) text-[0.75rem]">input</code> to step
      <em>n + 1</em>.
      <strong class="text-(--text) font-medium">Submitted steps</strong> is exactly what was in your JSON;
      <strong class="text-(--text) font-medium">Step-by-step</strong> is the recorded input, output, and time for each isolate
      (when available).
    </section>
  {/if}

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

  {#if trace.request.body ?? trace.request.code}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mt-3.5">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">
        Guest body{#if trace.request.template}<span class="font-normal text-(--text-3)"> · template <code class="text-[0.7rem]">{trace.request.template}</code></span>{/if}
      </div>
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{trace.request.body ?? trace.request.code}</pre>
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
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Submitted steps</div>
      <p class="text-[0.75rem] text-(--text-3) m-0 mb-3">From your <code class="text-[0.7rem]">POST /run/chain</code> body (before execution).</p>
      <div class="grid gap-3">
        {#each trace.request.steps as step, idx}
          <div class="bg-(--surface-alt) rounded-(--radius) p-3">
            <div class="font-semibold text-[0.8125rem]">{step.name ?? `Step ${idx + 1}`}</div>
            <div class="mt-2">
              <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Capabilities</div>
              <div class="flex gap-1.5 flex-wrap items-center">
                {#if step.capabilities.length > 0}
                  {#each step.capabilities as cap}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-on-bg) text-(--cap-on-text) border border-(--cap-on-border)">{cap}</span>
                  {/each}
                {:else}
                  <span class="text-[0.8125rem] text-(--text-2) leading-snug"
                    >None in your JSON — this step runs with default sandbox only.</span>
                {/if}
              </div>
            </div>
            {#if step.props !== undefined}
              <div class="mt-2">
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">props</div>
                <pre class="bg-(--surface) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{formatValue(step.props)}</pre>
              </div>
            {/if}
            {#if step.input !== undefined}
              <div class="mt-2">
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">input (wire)</div>
                <pre class="bg-(--surface) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{formatValue(step.input)}</pre>
              </div>
            {/if}
            {#if step.template}
              <div class="text-[0.6875rem] text-(--text-3) mt-2 mb-1">Template <code class="text-[0.7rem]">{step.template}</code></div>
            {/if}
            <pre class="bg-(--surface) rounded-(--radius) p-3 mt-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto">{step.body ?? step.code}</pre>
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
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">
      {trace.outcome.ok ? 'Final result' : 'Error'}
    </div>
    <p class="text-[0.75rem] text-(--text-3) m-0 mb-3">
      {trace.outcome.ok
        ? 'Value returned by the last step (or the only isolate).'
        : 'The run stopped here; step-by-step may show where it failed.'}
    </p>
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
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Step-by-step</div>
      <p class="text-[0.75rem] text-(--text-3) m-0 mb-3">
        Each card is one isolate. Compare <strong class="text-(--text-2) font-medium">Input</strong> (from the previous
        step or <code class="text-[0.7rem]">null</code>) to <strong class="text-(--text-2) font-medium">Output</strong>.
        <strong class="text-(--text-2) font-medium">Capabilities</strong> on the card are optional extras (e.g.
        <code class="text-[0.7rem]">kvRead</code>); if none are listed, this step used only the default sandbox — not an
        error.
      </p>
      <div class="grid gap-3">
        {#each trace.trace as entry, ti}
          <div class="bg-(--surface-alt) rounded-(--radius) p-3 border border-(--border)">
            <div class="flex justify-between items-center gap-3 mb-2 flex-wrap">
              <div class="font-semibold text-[0.8125rem] text-(--text)">
                Step {ti + 1} of {trace.trace!.length}
                <span class="font-normal text-(--text-3)">
                  — {entry.name ?? `isolate ${entry.step + 1}`}</span>
              </div>
              <div class="text-(--text-3) font-(family-name:--mono) text-xs">{entry.ms} ms</div>
            </div>
            <div class="mb-2">
              <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1.5">
                Capabilities
              </div>
              <div class="flex gap-1.5 flex-wrap items-center">
                {#if entry.capabilities.length > 0}
                  {#each entry.capabilities as cap}
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-(--cap-on-bg) text-(--cap-on-text) border border-(--cap-on-border)">{cap}</span>
                  {/each}
                {:else}
                  <span class="text-[0.8125rem] text-(--text-2) leading-snug"
                    >None — default sandbox only (no KV, AI, R2, etc. on this step).</span>
                {/if}
              </div>
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
