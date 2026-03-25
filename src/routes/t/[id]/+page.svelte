<script lang="ts">
  import TraceTimeline from '$lib/TraceTimeline.svelte';
  import TraceDiff from '$lib/TraceDiff.svelte';
  import CollapsiblePre from '$lib/CollapsiblePre.svelte';
  import AppLink from '$lib/AppLink.svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
  import { page } from '$app/state';

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
    error?: string;
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

  // State for trace viewer
  let selectedStep = $state<number | null>(null);
  let expandedSteps = $state<Set<number>>(new Set());
  let activeFilter = $state<string | null>(null);
  let showDetailPanel = $state(false);
  let activeTab = $state<'input' | 'output' | 'diff' | 'code'>('output');

  const timingItems = $derived.by(() => {
    const t = trace.timing;
    const items: string[] = [];
    if (t?.totalMs !== undefined) items.push(`total ${t.totalMs} ms`);
    if (t?.generateMs !== undefined) items.push(`generate ${t.generateMs} ms`);
    if (t?.runMs !== undefined) items.push(`run ${t.runMs} ms`);
    return items;
  });

  // Available capability filters based on trace data
  const availableFilters = $derived(() => {
    if (!trace.trace) return [];
    const caps = new Set<string>();
    trace.trace.forEach(row => {
      row.capabilities.forEach(cap => caps.add(cap));
    });
    return Array.from(caps).sort();
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

  function handleSelectStep(step: number) {
    selectedStep = step;
    showDetailPanel = true;
  }

  function handleToggleExpand(step: number) {
    const newSet = new Set(expandedSteps);
    if (newSet.has(step)) {
      newSet.delete(step);
    } else {
      newSet.add(step);
    }
    expandedSteps = newSet;
  }

  function setFilter(filter: string | null) {
    activeFilter = activeFilter === filter ? null : filter;
  }

  // Get selected step data
  const selectedStepData = $derived(
    selectedStep !== null && trace.trace 
      ? trace.trace.find(r => r.step === selectedStep) 
      : null
  );

  // Calculate diff between previous step output and current step input
  const stepDiff = $derived(() => {
    if (!selectedStepData || !trace.trace) return null;
    const currentStep = selectedStepData.step;
    if (currentStep === 0) return null;
    
    const prevStep = trace.trace.find(r => r.step === currentStep - 1);
    if (!prevStep) return null;
    
    return {
      from: prevStep.output,
      to: selectedStepData.input,
    };
  });

  // Helper for detail panel
  const canShowDiff = $derived(selectedStepData ? selectedStepData.step > 0 : false);
  const previousStepData = $derived(
    canShowDiff && trace.trace && selectedStep !== null
      ? trace.trace.find(r => selectedStep !== null && r.step === selectedStep - 1)
      : null
  );
</script>

<SEO
  title={`Run ${trace.id} — lab`}
  description="A shareable execution trace: inputs, outputs, errors, and timing across isolates."
  path={page.url.pathname}
  type="website"
/>

<div class="max-w-3xl mx-auto px-5 py-8 pb-12">
  <!-- Header -->
  <header class="flex justify-between items-start gap-4 mb-6 max-sm:flex-col">
    <div>
      <h1 class="text-lg font-semibold tracking-tight text-(--text)">Trace</h1>
      <p class="text-(--text-2) text-[0.8125rem] mt-1 mb-0 max-w-[52ch] leading-relaxed">
        <strong class="text-(--text) font-medium">{trace.type}</strong> —
        {#if trace.type === 'chain'}
          {trace.trace?.length || 0} isolates ran in sequence
        {:else if trace.type === 'spawn'}
          nested isolate execution with spawn
        {:else}
          single isolate execution
        {/if}
      </p>
      <div class="text-(--text-3) text-[0.75rem] mt-2 font-mono">{trace.id}</div>
      <div class="text-(--text-3) text-[0.8125rem] mt-0.5">{trace.createdAt}</div>
    </div>
    <div class="flex gap-3 flex-wrap text-[0.8125rem]">
      <a href="/compose" class="text-(--text-2) no-underline bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 hover:text-(--text)">Compose</a>
      <button type="button" onclick={goFork} class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) text-[0.8125rem]">Fork</button>
      <a href="/t/{trace.id}.json" class="text-(--text-2) no-underline bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 hover:text-(--text)">JSON</a>
      <button type="button" onclick={copyUrl} class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) text-[0.8125rem]">Copy URL</button>
    </div>
  </header>

  <!-- Outcome Summary -->
  <section class="mb-6 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem] text-(--text-2) leading-relaxed space-y-3">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold uppercase tracking-wide border {trace.outcome.ok ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}">
        {trace.outcome.ok ? 'Succeeded' : 'Failed'}
      </span>
      <span><strong class="text-(--text) font-medium">Mode</strong> <code class="text-[0.75rem]">{trace.type}</code></span>
      {#if timingItems.length > 0}
        <span class="text-(--text-3)">· {timingItems.join(' · ')}</span>
      {/if}
    </div>
    {#if !trace.outcome.ok}
      <p class="m-0 text-red-400 text-[0.8125rem]">{outcomeSummary}</p>
    {/if}
  </section>

  <!-- Final Result -->
  <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mb-6">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">
      {trace.outcome.ok ? 'Final result' : 'Error'}
    </div>
    {#if outcomeCompact}
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto">{outcomeText()}</pre>
    {:else}
      <CollapsiblePre label="Full output" text={outcomeText()} defaultOpen={!trace.outcome.ok} />
    {/if}
  </section>

  <!-- Trace Timeline Section -->
  {#if trace.trace && trace.trace.length > 0}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Step-by-step</div>
          <p class="text-[0.75rem] text-(--text-3) m-0 mt-1">
            Click a step to inspect input, output, and timing. Expand to see code.
          </p>
        </div>
        
        <!-- Capability Filters -->
        {#if availableFilters().length > 0}
          <div class="flex gap-1.5 flex-wrap">
            <button 
              class="px-2.5 py-1 rounded-full text-[0.6875rem] font-medium border transition-colors
                {activeFilter === null ? 'bg-(--accent) text-white border-(--accent)' : 'bg-(--surface-alt) text-(--text-2) border-(--border) hover:border-(--accent)/30'}"
              onclick={() => setFilter(null)}
            >
              All
            </button>
            {#each availableFilters() as cap}
              <button 
                class="px-2.5 py-1 rounded-full text-[0.6875rem] font-medium border transition-colors
                  {activeFilter === cap ? 'bg-(--accent) text-white border-(--accent)' : 'bg-(--surface-alt) text-(--text-2) border-(--border) hover:border-(--accent)/30'}"
                onclick={() => setFilter(cap)}
              >
                {cap}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Timeline Component -->
      <TraceTimeline 
        trace={trace.trace}
        {selectedStep}
        onSelect={handleSelectStep}
        {expandedSteps}
        onToggleExpand={handleToggleExpand}
        filter={activeFilter}
      />
    </section>
  {/if}

  <!-- Detail Panel (Slide-out) -->
  {#if showDetailPanel && selectedStepData}
    <div class="fixed inset-0 z-50" onclick={() => showDetailPanel = false}>
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50"
        transition:fade={{ duration: 120 }}
      ></div>
      
      <!-- Panel -->
      <div 
        class="absolute right-0 top-0 bottom-0 w-full max-w-3xl bg-(--surface) border-l border-(--border) shadow-2xl overflow-y-auto"
        onclick={(e) => e.stopPropagation()}
        transition:fly={{ x: 28, duration: 160, easing: cubicOut }}
      >
        <div class="p-5">
          <!-- Panel Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-(--text)">
                Step {selectedStepData.step + 1}: {selectedStepData.name || `Isolate ${selectedStepData.step + 1}`}
              </h2>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[0.75rem] font-mono text-(--text-3)">{selectedStepData.ms}ms</span>
                {#each selectedStepData.capabilities as cap}
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-medium bg-(--accent)/10 text-(--accent) border border-(--accent)/30">
                    {cap}
                  </span>
                {/each}
              </div>
            </div>
            <button 
              type="button"
              class="text-(--text-3) hover:text-(--text) p-2 rounded hover:bg-(--surface-alt)"
              onclick={() => showDetailPanel = false}
              aria-label="Close"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="border-b border-(--border) mb-4">
            <div class="flex gap-1">
              <button 
                class="px-4 py-2 text-[0.8125rem] font-medium border-b-2 transition-colors
                  {activeTab === 'output' ? 'border-(--accent) text-(--text)' : 'border-transparent text-(--text-3) hover:text-(--text)'}"
                onclick={() => activeTab = 'output'}
              >
                Output
              </button>
              <button 
                class="px-4 py-2 text-[0.8125rem] font-medium border-b-2 transition-colors
                  {activeTab === 'input' ? 'border-(--accent) text-(--text)' : 'border-transparent text-(--text-3) hover:text-(--text)'}"
                onclick={() => activeTab = 'input'}
              >
                Input
              </button>
              {#if canShowDiff && previousStepData}
                <button 
                  class="px-4 py-2 text-[0.8125rem] font-medium border-b-2 transition-colors
                    {activeTab === 'diff' ? 'border-(--accent) text-(--text)' : 'border-transparent text-(--text-3) hover:text-(--text)'}"
                  onclick={() => activeTab = 'diff'}
                >
                  Diff
                </button>
              {/if}
              {#if selectedStepData.body}
                <button 
                  class="px-4 py-2 text-[0.8125rem] font-medium border-b-2 transition-colors
                    {activeTab === 'code' ? 'border-(--accent) text-(--text)' : 'border-transparent text-(--text-3) hover:text-(--text)'}"
                  onclick={() => activeTab = 'code'}
                >
                  Code
                </button>
              {/if}
            </div>
          </div>

          <div class="space-y-4">
            {#if activeTab === 'output'}
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Output</div>
                <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto border border-(--border)">{formatValue(selectedStepData.output)}</pre>
              </div>
            {:else if activeTab === 'input'}
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Input</div>
                <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto border border-(--border)">{formatValue(selectedStepData.input)}</pre>
              </div>
            {:else if activeTab === 'diff' && canShowDiff && previousStepData}
              <TraceDiff 
                from={previousStepData.output}
                to={selectedStepData.input}
                fromLabel="Step {previousStepData.step + 1} output"
                toLabel="Step {selectedStepData.step + 1} input"
              />
            {:else if activeTab === 'code' && selectedStepData.body}
              <div>
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Code</div>
                <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto border border-(--border)">{selectedStepData.body}</pre>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
