<script lang="ts">
  import type { RunResult } from '@acoyfellow/lab';
  import { runChain } from '$lib/api';
  import { Button } from '$lib/components/ui/button';
  import { goto } from '$app/navigation';
  import PlayIcon from '@lucide/svelte/icons/play';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';

  const steps = [
    {
      name: 'Generate data',
      body: 'return { users: [{name: "Alice"}, {name: "Bob"}], count: 2 }',
      capabilities: []
    },
    {
      name: 'Transform',
      body: 'return input.users.map(u => u.name.toUpperCase())',
      capabilities: []
    },
    {
      name: 'Format result',
      body: 'return { names: input, total: input.length, timestamp: Date.now() }',
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
</script>

<div class="space-y-4">
  <!-- Visual step pipeline -->
  <div class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
    {#each steps as step, i}
      <div class="px-4 py-3 {i > 0 ? 'border-t border-(--border)' : ''}">
        <div class="flex items-center gap-2.5 mb-1.5">
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-(--accent)/10 text-(--accent) flex items-center justify-center text-[0.625rem] font-bold">{i + 1}</span>
          <span class="text-[0.8125rem] font-medium text-(--text)">{step.name}</span>
        </div>
        <code class="block text-[0.75rem] font-mono text-(--text-2) pl-[1.875rem] leading-relaxed">{step.body}</code>
      </div>
      {#if i < steps.length - 1}
        <div class="flex justify-center -my-1.5 relative z-10">
          <span class="text-(--text-3) text-[0.625rem]">↓</span>
        </div>
      {/if}
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
      Edit in Compose
    </button>
  </div>

  {#if result && result.ok}
    <div class="rounded-(--radius) border border-emerald-500/25 bg-white p-4 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[0.75rem] font-semibold text-emerald-500">Result</span>
        {#if result.traceId}
          <a href="/t/{result.traceId}" class="text-[0.75rem] text-(--accent) hover:underline font-medium">
            Open trace →
          </a>
        {/if}
      </div>
      <pre class="font-mono text-xs text-(--text) m-0 overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
    </div>
  {/if}

  {#if result && !result.ok}
    <pre class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-500 overflow-x-auto">{JSON.stringify({ error: result.error, reason: result.reason }, null, 2)}</pre>
  {/if}

  {#if error}
    <pre class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-500 overflow-x-auto">{error}</pre>
  {/if}
</div>
