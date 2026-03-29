<script lang="ts">
  import { slide, fade } from 'svelte/transition';

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

  type Props = {
    trace: TraceRow[];
    selectedStep: number | null;
    onSelect: (step: number) => void;
    expandedSteps: Set<number>;
    onToggleExpand: (step: number) => void;
    filter: string | null;
  };

  let { trace, selectedStep, onSelect, expandedSteps, onToggleExpand, filter }: Props = $props();

  // Calculate total duration for Gantt scaling
  const totalMs = $derived(trace.reduce((sum, row) => sum + row.ms, 0));
  const maxMs = $derived(Math.max(...trace.map(r => r.ms), 1));

  // Capability color mapping
  const capabilityColors: Record<string, { bg: string; text: string; border: string }> = {
    kvRead: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    r2Read: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    d1Read: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    workersAi: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
    spawn: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    durableObjectFetch: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    containerHttp: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    petri: { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' },
  };

  function getCapabilityStyle(cap: string) {
    return capabilityColors[cap] || { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
  }

  // Filter steps based on capability filter
  const filteredTrace = $derived(
    filter 
      ? trace.filter(row => row.capabilities.includes(filter))
      : trace
  );

  function formatValue(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    return JSON.stringify(value, null, 2);
  }

  function truncateValue(value: unknown, maxLen: number = 60): string {
    const str = formatValue(value);
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '…';
  }
</script>

<div class="space-y-1">
  <!-- Header row -->
  <div class="grid grid-cols-[1fr,140px] gap-3 px-3 py-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) border-b border-(--border)">
    <div>Step</div>
    <div class="text-right">Duration</div>
  </div>

  <!-- Step rows -->
  {#each filteredTrace as row, index (row.step)}
    {@const isSelected = selectedStep === row.step}
    {@const isExpanded = expandedSteps.has(row.step)}
    {@const hasError = row.error || (typeof row.output === 'object' && row.output && 'error' in row.output)}
    
    <div 
      class="group grid grid-cols-[1fr,140px] gap-3 px-3 py-2.5 rounded-(--radius) border transition-all cursor-pointer
        {isSelected 
          ? 'bg-(--accent)/10 border-(--accent)/30' 
          : 'bg-(--surface-alt) border-(--border) hover:border-(--accent)/30'}
        {hasError ? 'border-l-2 border-l-red-500' : ''}"
      onclick={() => onSelect(row.step)}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && onSelect(row.step)}
    >
      <!-- Left: Tree info -->
      <div class="flex items-center gap-2 min-w-0">
        <!-- Step number -->
        <span class="text-[0.75rem] font-mono text-(--text-3) w-6 flex-shrink-0">{row.step + 1}</span>
        
        <!-- Expand/collapse toggle (if has body/code to show) -->
        {#if row.body}
          <button
            class="w-5 h-5 flex items-center justify-center rounded text-(--text-3) hover:text-(--text) hover:bg-(--surface) transition-colors flex-shrink-0"
            onclick={(e) => { e.stopPropagation(); onToggleExpand(row.step); }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg class="w-3 h-3 transition-transform {isExpanded ? 'rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        {:else}
          <span class="w-5 flex-shrink-0"></span>
        {/if}
        
        <!-- Step name -->
        <span class="font-medium text-[0.8125rem] text-(--text) truncate">
          {row.name || `Step ${row.step + 1}`}
        </span>
        
        <!-- Capability badges -->
        <div class="flex gap-1 flex-shrink-0">
          {#each row.capabilities as cap}
            {@const style = getCapabilityStyle(cap)}
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-medium {style.bg} {style.text} border {style.border}">
              {cap}
            </span>
          {/each}
          {#if row.capabilities.length === 0}
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-medium bg-(--surface) text-(--text-3) border border-(--border)">
              sandbox
            </span>
          {/if}
        </div>
      </div>

      <!-- Right: Timing bar -->
      <div class="flex items-center gap-2 justify-end">
        <!-- Gantt bar -->
        <div class="flex-1 h-2 bg-(--surface) rounded-full overflow-hidden max-w-[80px]">
          <div 
            class="h-full rounded-full {hasError ? 'bg-red-500' : 'bg-(--accent)'} transition-all"
            style="width: {(row.ms / maxMs) * 100}%"
          ></div>
        </div>
        <!-- Timing label -->
        <span class="text-[0.75rem] font-mono text-(--text-2) w-12 text-right">{row.ms}ms</span>
      </div>
    </div>

    <!-- Expanded details inline -->
    {#if isExpanded && row.body}
      <div class="ml-8 mr-0 mb-2" transition:slide={{ duration: 150 }}>
        <div class="bg-(--surface) rounded-(--radius) border border-(--border) p-3">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Code</div>
          <pre class="font-mono text-[0.75rem] text-(--text-2) whitespace-pre-wrap overflow-x-auto">{row.body}</pre>
        </div>
      </div>
    {/if}

    <!-- Quick preview on hover/select -->
    {#if isSelected}
      <div class="ml-8 mr-0 text-[0.75rem] text-(--text-3)" transition:fade={{ duration: 100 }}>
        <span class="text-(--text-2)">Input:</span> {truncateValue(row.input)}
        <span class="mx-2">→</span>
        <span class="text-(--text-2)">Output:</span> {truncateValue(row.output)}
      </div>
    {/if}
  {/each}

  {#if filteredTrace.length === 0}
    <div class="text-center py-8 text-(--text-3) text-[0.8125rem]">
      No steps match the selected filter
    </div>
  {/if}
</div>

<style>
  /* Ensure smooth transitions */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
</style>
