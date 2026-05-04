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
  import { listStories, createStory, appendToStory } from '../../data.remote';

  type ResultRequest = {
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
    source?: string;
    action?: string;
    actor?: unknown;
    input?: unknown;
    output?: unknown;
    replay?: unknown;
    evidence?: unknown;
    metadata?: unknown;
    parentId?: string;
    supersedes?: string;
  };

  type ResultStepRow = {
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

  type ResultPageData = {
    id: string;
    type: string;
    createdAt: string;
    request: ResultRequest;
    outcome: { ok: boolean; result?: unknown; error?: string; reason?: string };
    timing?: Record<string, number>;
    generated?: string;
    steps?: ResultStepRow[];
    receipt?: {
      source: string;
      action: string;
      actor?: unknown;
      input?: unknown;
      output?: unknown;
      capabilities?: string[];
      replay?: { mode?: string; available?: boolean; reason?: string };
      evidence?: unknown;
      metadata?: unknown;
    };
    lineage?: {
      parentId?: string;
      supersedes?: string;
    };
  };

  let { data } = $props();
  const result = $derived(data.result as ResultPageData);

  // State for receipt viewer
  let selectedStep = $state<number | null>(null);
  let expandedSteps = $state<Set<number>>(new Set());
  let activeFilter = $state<string | null>(null);
  let showDetailPanel = $state(false);
  let activeTab = $state<'input' | 'output' | 'diff' | 'code'>('output');

  const timingItems = $derived.by(() => {
    const t = result.timing;
    const items: string[] = [];
    if (t?.totalMs !== undefined) items.push(`total ${t.totalMs} ms`);
    if (t?.generateMs !== undefined) items.push(`generate ${t.generateMs} ms`);
    if (t?.runMs !== undefined) items.push(`run ${t.runMs} ms`);
    return items;
  });

  // Available capability filters based on receipt step data
  const availableFilters = $derived(() => {
    if (!result.steps) return [];
    const caps = new Set<string>();
    result.steps.forEach(row => {
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
    if (!result.outcome.ok) {
      return result.outcome.reason
        ? `${result.outcome.error}\nreason: ${result.outcome.reason}`
        : result.outcome.error ?? 'Unknown error';
    }
    return formatValue(result.outcome.result);
  }

  const outcomeCompact = $derived(result.outcome.ok && outcomeText().length <= 240);
  const outcomeSummary = $derived.by(() => {
    if (result.outcome.ok) return 'ok — result below.';
    const err = result.outcome.error ?? 'unknown';
    return err.length > 160 ? `${err.slice(0, 160)}…` : err;
  });

  const resultKind = 'Receipt';
  const typeSummary = $derived.by(() => {
    if (result.type === 'external' && result.receipt) {
      return `${result.receipt.source}.${result.receipt.action}`;
    }
    if (result.type === 'chain') return `${result.steps?.length || 0}-step chain`;
    if (result.type === 'spawn') return 'Nested spawn execution';
    if (result.type === 'generate') return 'AI-generated run';
    return 'Single isolate run';
  });

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
  }

  function forkPayload(): Record<string, unknown> {
    const r = result.request;
    const base: Record<string, unknown> = { mode: result.type };
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

  // --- Story + Healing integration ---
  let storyPickerOpen = $state(false);
  let storyPickerLoading = $state(false);
  let storyPickerError = $state<string | null>(null);
  let existingStories = $state<Array<{ id: string; title: string }>>([]);
  let newStoryTitle = $state('');
  let busyStoryAction = $state(false);

  async function openStoryPicker() {
    storyPickerOpen = true;
    storyPickerError = null;
    storyPickerLoading = true;
    try {
      const r = await listStories({ limit: 50 });
      if (r.ok && r.stories) {
        existingStories = r.stories.map((s: { id: string; title: string }) => ({ id: s.id, title: s.title }));
      } else {
        existingStories = [];
        if (r.error) storyPickerError = r.error;
      }
    } catch (e) {
      storyPickerError = e instanceof Error ? e.message : String(e);
    } finally {
      storyPickerLoading = false;
    }
  }

  async function handleCreateStory() {
    const title = newStoryTitle.trim();
    if (!title) return;
    busyStoryAction = true;
    storyPickerError = null;
    try {
      const r = await createStory({ title, traceIds: [result.id] });
      if (r.ok && r.story) {
        window.location.href = `/stories/${r.story.id}`;
      } else {
        storyPickerError = r.error ?? 'Failed to create story';
      }
    } catch (e) {
      storyPickerError = e instanceof Error ? e.message : String(e);
    } finally {
      busyStoryAction = false;
    }
  }

  async function handleAppendToStory(storyId: string) {
    busyStoryAction = true;
    storyPickerError = null;
    try {
      const r = await appendToStory({ storyId, traceId: result.id });
      if (r.ok) {
        window.location.href = `/stories/${storyId}`;
      } else {
        storyPickerError = r.error ?? 'Failed to append';
      }
    } catch (e) {
      storyPickerError = e instanceof Error ? e.message : String(e);
    } finally {
      busyStoryAction = false;
    }
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
    selectedStep !== null && result.steps
      ? result.steps.find(r => r.step === selectedStep)
      : null
  );

  // Calculate diff between previous step output and current step input
  const stepDiff = $derived(() => {
    if (!selectedStepData || !result.steps) return null;
    const currentStep = selectedStepData.step;
    if (currentStep === 0) return null;
    
    const prevStep = result.steps.find(r => r.step === currentStep - 1);
    if (!prevStep) return null;
    
    return {
      from: prevStep.output,
      to: selectedStepData.input,
    };
  });

  // Helper for detail panel
  const canShowDiff = $derived(selectedStepData ? selectedStepData.step > 0 : false);
  const previousStepData = $derived(
    canShowDiff && result.steps && selectedStep !== null
      ? result.steps.find(r => selectedStep !== null && r.step === selectedStep - 1)
      : null
  );
</script>

<SEO
  title={`Receipt ${result.id} — Lab`}
  description="Inspect what ran, what returned, and how long it took. Fork it or share it."
  path={page.url.pathname}
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 pb-12">
  <!-- Header -->
  <header class="flex justify-between items-start gap-4 mb-6 max-sm:flex-col">
    <div>
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold tracking-tight text-(--text) m-0">{resultKind}</h1>
        <span class="text-[0.6875rem] font-mono text-(--text-3) bg-(--surface-alt) px-2 py-0.5 rounded">{result.id}</span>
      </div>
      <p class="text-(--text-2) text-[0.8125rem] mt-1.5 mb-0 max-w-[52ch] leading-relaxed">
        {typeSummary}
        <span class="text-(--text-3)">· {result.createdAt}</span>
      </p>
    </div>
    <div class="flex gap-2 flex-wrap text-[0.8125rem]">
      {#if !result.outcome.ok && result.type !== 'external'}
        <a
          href="/healing?traceId={result.id}"
          class="text-white bg-(--accent) border border-(--accent) rounded-(--radius) px-3 py-1.5 no-underline hover:opacity-90 text-[0.8125rem]"
        >
          Diagnose
        </a>
      {/if}
      <button type="button" onclick={openStoryPicker} class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) hover:border-(--accent)/30 text-[0.8125rem]">Add to story</button>
      {#if result.type !== 'external'}
        <button type="button" onclick={goFork} class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) hover:border-(--accent)/30 text-[0.8125rem]">Fork</button>
      {/if}
      <a href="/results/{result.id}.json" class="text-(--text-2) no-underline bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 hover:text-(--text) hover:border-(--accent)/30">JSON</a>
      <button type="button" onclick={copyUrl} class="text-(--text-2) bg-(--surface) border border-(--border) rounded-(--radius) px-3 py-1.5 cursor-pointer hover:text-(--text) hover:border-(--accent)/30 text-[0.8125rem]">Copy URL</button>
    </div>
  </header>

  <!-- Outcome Summary -->
  <section class="mb-6 rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem] text-(--text-2) leading-relaxed space-y-3">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold uppercase tracking-wide border {result.outcome.ok ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}">
        {result.outcome.ok ? 'Succeeded' : 'Failed'}
      </span>
      <span><strong class="text-(--text) font-medium">Mode</strong> <code class="text-[0.75rem]">{result.type}</code></span>
      {#if result.receipt?.replay}
        <span><strong class="text-(--text) font-medium">Replay</strong> <code class="text-[0.75rem]">{result.receipt.replay.mode}</code></span>
      {/if}
      {#if timingItems.length > 0}
        <span class="text-(--text-3)">· {timingItems.join(' · ')}</span>
      {/if}
    </div>
    {#if !result.outcome.ok}
      <p class="m-0 text-red-400 text-[0.8125rem]">{outcomeSummary}</p>
    {/if}
  </section>

  {#if result.type === 'external' && result.receipt}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mb-6 space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 text-[0.8125rem]">
        <div>
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Source</div>
          <code class="text-[0.8125rem]">{result.receipt.source}</code>
        </div>
        <div>
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Action</div>
          <code class="text-[0.8125rem]">{result.receipt.action}</code>
        </div>
      </div>

      {#if result.receipt.capabilities && result.receipt.capabilities.length > 0}
        <div>
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Authority used</div>
          <div class="flex flex-wrap gap-1.5">
            {#each result.receipt.capabilities as cap}
              <span class="inline-flex items-center px-2 py-1 rounded text-[0.6875rem] font-medium bg-(--accent)/10 text-(--accent) border border-(--accent)/30">
                {cap}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#if result.receipt.replay}
        <div class="rounded-(--radius) bg-(--surface-alt) border border-(--border) p-3">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Replay posture</div>
          <p class="text-[0.8125rem] text-(--text-2) m-0">
            <code>{result.receipt.replay.mode}</code>
            {#if result.receipt.replay.available === false}
              <span> · inspect only</span>
            {/if}
            {#if result.receipt.replay.reason}
              <span> · {result.receipt.replay.reason}</span>
            {/if}
          </p>
        </div>
      {/if}

      {#if result.lineage?.parentId || result.lineage?.supersedes}
        <div class="text-[0.8125rem] text-(--text-2)">
          {#if result.lineage.parentId}
            <div>Continues from <a class="text-(--accent) hover:underline" href="/results/{result.lineage.parentId}">{result.lineage.parentId}</a></div>
          {/if}
          {#if result.lineage.supersedes}
            <div>Supersedes <a class="text-(--accent) hover:underline" href="/results/{result.lineage.supersedes}">{result.lineage.supersedes}</a></div>
          {/if}
        </div>
      {/if}
    </section>
  {/if}

  <!-- Final Result -->
  <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5 mb-6">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">
      {result.outcome.ok ? 'Final result' : 'Error'}
    </div>
    {#if outcomeCompact}
      <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto">{outcomeText()}</pre>
    {:else}
      <CollapsiblePre label="Full output" text={outcomeText()} defaultOpen={!result.outcome.ok} />
    {/if}
  </section>

  {#if result.type === 'external' && result.receipt}
    <section class="grid gap-3 sm:grid-cols-2 mb-6">
      {#if result.receipt.input !== undefined}
        <div class="bg-(--surface) border border-(--border) rounded-lg p-3.5">
          <CollapsiblePre label="Input" text={formatValue(result.receipt.input)} defaultOpen={false} />
        </div>
      {/if}
      {#if result.receipt.evidence !== undefined}
        <div class="bg-(--surface) border border-(--border) rounded-lg p-3.5">
          <CollapsiblePre label="Evidence" text={formatValue(result.receipt.evidence)} defaultOpen={false} />
        </div>
      {/if}
      {#if result.receipt.actor !== undefined}
        <div class="bg-(--surface) border border-(--border) rounded-lg p-3.5">
          <CollapsiblePre label="Actor" text={formatValue(result.receipt.actor)} defaultOpen={false} />
        </div>
      {/if}
      {#if result.receipt.metadata !== undefined}
        <div class="bg-(--surface) border border-(--border) rounded-lg p-3.5">
          <CollapsiblePre label="Metadata" text={formatValue(result.receipt.metadata)} defaultOpen={false} />
        </div>
      {/if}
    </section>
  {/if}

  <!-- Step Timeline Section -->
  {#if result.steps && result.steps.length > 0}
    <section class="bg-(--surface) border border-(--border) rounded-lg p-3.5">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Step-by-step</div>
          <p class="text-[0.75rem] text-(--text-3) m-0 mt-1">
            Click a step to inspect its data. Expand to see code.
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
        steps={result.steps}
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
    <div class="fixed inset-0 z-50">
      <!-- Backdrop -->
      <button
        type="button"
        class="absolute inset-0 bg-black/50 w-full h-full cursor-default"
        transition:fade={{ duration: 120 }}
        onclick={() => showDetailPanel = false}
        aria-label="Close panel"
      ></button>

      <!-- Panel -->
      <div
        class="absolute right-0 top-0 bottom-0 w-full max-w-3xl bg-(--surface) border-l border-(--border) shadow-2xl overflow-y-auto"
        transition:fly={{ x: 28, duration: 160, easing: cubicOut }}
        role="dialog"
        aria-modal="true"
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
                <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Input {selectedStepData.step === 0 ? '(chain start)' : ''}</div>
                {#if selectedStepData.input === null || selectedStepData.input === undefined}
                  <div class="bg-(--surface-alt) rounded-(--radius) p-3 text-xs text-(--text-3) italic border border-(--border)">
                    {selectedStepData.step === 0 ? 'Step 1 receives no input from a previous step' : 'null'}
                  </div>
                {:else}
                  <pre class="bg-(--surface-alt) rounded-(--radius) p-3 font-mono text-xs whitespace-pre-wrap overflow-x-auto border border-(--border)">{formatValue(selectedStepData.input)}</pre>
                {/if}
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

  <!-- Story picker modal -->
  {#if storyPickerOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        class="absolute inset-0 bg-black/50 w-full h-full cursor-default"
        transition:fade={{ duration: 120 }}
        onclick={() => storyPickerOpen = false}
        aria-label="Close story picker"
      ></button>

      <div
        class="relative w-full max-w-md mx-4 bg-(--surface) border border-(--border) rounded-(--radius) shadow-2xl p-5 space-y-4"
        transition:fly={{ y: 12, duration: 160, easing: cubicOut }}
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-[0.875rem] font-semibold text-(--text) m-0">Add to story</h2>
          <button
            type="button"
            class="text-(--text-3) hover:text-(--text) p-1 rounded hover:bg-(--surface-alt)"
            onclick={() => storyPickerOpen = false}
            aria-label="Close"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- New story -->
        <div class="space-y-2">
          <label for="new-story-title" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block">
            Start new story
          </label>
          <div class="flex gap-2">
            <input
              id="new-story-title"
              type="text"
              bind:value={newStoryTitle}
              placeholder="Story title…"
              disabled={busyStoryAction}
              class="flex-1 border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem]"
            />
            <button
              type="button"
              onclick={handleCreateStory}
              disabled={busyStoryAction || !newStoryTitle.trim()}
              class="text-white bg-(--accent) border border-(--accent) rounded-(--radius) px-3 py-2 cursor-pointer disabled:opacity-50 text-[0.8125rem]"
            >
              Create
            </button>
          </div>
        </div>

        <!-- Append to existing -->
        <div class="space-y-2">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Append to existing
          </div>
          {#if storyPickerLoading}
            <p class="text-[0.75rem] text-(--text-3)">Loading stories…</p>
          {:else if existingStories.length === 0}
            <p class="text-[0.75rem] text-(--text-3)">No existing stories.</p>
          {:else}
            <div class="max-h-48 overflow-y-auto space-y-1 border border-(--border) rounded-(--radius) p-1">
              {#each existingStories as s}
                <button
                  type="button"
                  onclick={() => handleAppendToStory(s.id)}
                  disabled={busyStoryAction}
                  class="w-full text-left px-2 py-1.5 rounded text-[0.8125rem] text-(--text-2) hover:bg-(--surface-alt) hover:text-(--text) disabled:opacity-50 truncate"
                  title={s.title}
                >
                  {s.title}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        {#if storyPickerError}
          <div class="text-[0.75rem] text-red-600">{storyPickerError}</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
