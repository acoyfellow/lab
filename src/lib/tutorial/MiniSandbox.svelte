<script lang="ts">
  import type { RunResult } from '@acoyfellow/lab';
  import { runChain } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { goto } from '$app/navigation';
  import PlayIcon from '@lucide/svelte/icons/play';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';

  const steps = [
    {
      name: 'Load broken JSON',
      body: `const raw = '{"users": [{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob",}]}';
return { raw, attempt: 1 };`,
      capabilities: []
    },
    {
      name: 'Try to parse',
      body: `try {
  return { ok: true, data: JSON.parse(input.raw), attempts: input.attempt };
} catch (e) {
  return { ok: false, error: e.message, raw: input.raw, attempt: input.attempt };
}`,
      capabilities: []
    },
    {
      name: 'Diagnose and heal',
      body: `if (input.ok) return input;
let fixed = input.raw.replace(/,(\\s*[}\\]])/g, '$1');
try {
  return { ok: true, data: JSON.parse(fixed), healed: true, diagnosis: 'Removed trailing comma' };
} catch (e) {
  return { ok: false, error: e.message, attempt: input.attempt + 1 };
}`,
      capabilities: []
    },
    {
      name: 'Validate',
      body: `return {
  healed: !!input.healed,
  valid: input.ok,
  users: input.data?.users?.length ?? 0,
  diagnosis: input.diagnosis || 'No repair needed',
};`,
      capabilities: []
    }
  ];

  let loading = $state(false);
  let result = $state<RunResult | null>(null);
  let error = $state<string | null>(null);

  async function run() {
    loading = true;
    error = null;
    result = null;
    try {
      const r = await runChain(steps);
      result = r;
      if (!r.ok) {
        error = JSON.stringify({ error: r.error, reason: r.reason }, null, 2);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function openInCompose() {
    sessionStorage.setItem('lab-fork', JSON.stringify({
      mode: 'chain',
      steps: steps
    }));
    goto('/compose');
  }

  const stepColors = [
    'text-red-400',      // broken data
    'text-amber-400',    // try/fail
    'text-emerald-400',  // heal
    'text-blue-400',     // validate
  ];

  const stepIcons = [
    '!',   // load broken
    '?',   // try parse
    '+',   // heal
    '=',   // validate
  ];
</script>

<div class="space-y-4">
  <!-- Visual step pipeline showing the narrative -->
  <div class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
    {#each steps as step, i}
      {#if i > 0}
        <div class="flex items-center gap-2 px-4 py-1 bg-(--surface-alt)/50 border-t border-(--border)">
          <span class="text-[0.625rem] text-(--text-3) font-mono">↓ output becomes <code class="text-(--text-2)">input</code></span>
        </div>
      {/if}
      <div class="px-4 py-3 {i > 0 ? 'border-t border-(--border)' : ''}">
        <div class="flex items-center gap-2.5 mb-1.5">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-(--surface-alt) flex items-center justify-center text-[0.625rem] font-bold {stepColors[i]}">{stepIcons[i]}</span>
          <span class="text-[0.8125rem] font-medium text-(--text)">Step {i + 1}: {step.name}</span>
        </div>
        <pre class="text-[0.7rem] font-mono text-(--text-2) pl-[1.875rem] leading-relaxed m-0 whitespace-pre-wrap">{step.body}</pre>
      </div>
    {/each}
  </div>

  <div class="flex items-center gap-3">
    <Button onclick={run} disabled={loading}>
      {loading ? 'Running...' : 'Run this chain'}
      {#if loading}
        <Loader2Icon class="w-4 h-4 animate-spin" />
      {:else}
        <PlayIcon class="w-4 h-4" />
      {/if}
    </Button>
    <button onclick={openInCompose} class="text-[0.8125rem] text-(--text-2) hover:text-(--text) underline underline-offset-2 bg-transparent border-none cursor-pointer p-0">
      Fork in Compose
    </button>
  </div>

  {#if result && result.ok}
    <div class="rounded-(--radius) border border-emerald-500/25 bg-white p-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[0.75rem] font-semibold text-emerald-500">Healed and validated</span>
        {#if result.traceId}
          <a href="/t/{result.traceId}" class="text-[0.75rem] text-(--accent) hover:underline font-medium">
            Open the trace — follow the full story →
          </a>
        {/if}
      </div>
      <pre class="font-mono text-xs text-(--text) m-0 overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
    </div>
  {/if}

  {#if result && !result.ok}
    <div class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-4 space-y-2">
      <span class="text-[0.75rem] font-semibold text-red-400">Failed</span>
      {#if result.traceId}
        <a href="/t/{result.traceId}" class="text-[0.75rem] text-(--accent) hover:underline font-medium block">
          Open the trace to see what happened →
        </a>
      {/if}
      <pre class="font-mono text-xs text-red-500 m-0 overflow-x-auto">{JSON.stringify({ error: result.error, reason: result.reason }, null, 2)}</pre>
    </div>
  {/if}

  {#if error}
    <pre class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-500 overflow-x-auto">{error}</pre>
  {/if}
</div>
