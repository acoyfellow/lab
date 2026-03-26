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
  <div class="flex items-center justify-between">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      3-Step Chain
    </div>
    <Button onclick={openInCompose} variant="outline" size="sm">
      Edit →
    </Button>
  </div>
  
  <pre class="rounded-(--radius) border border-(--border) bg-(--code-bg) p-3 font-mono text-xs text-(--text) overflow-x-auto">{JSON.stringify(steps, null, 2)}</pre>
  
  <div class="flex items-center gap-3">
    <Button onclick={run} disabled={loading}>
      {loading ? 'Running…' : 'Run'}
      <!-- icons -->
      {#if loading}
        <Loader2Icon class="w-4 h-4 animate-spin" />
      {:else}
        <PlayIcon class="w-4 h-4" />
      {/if}
    </Button>
    
    {#if result?.traceId}
      <a href="/t/{result.traceId}" class="text-[0.8125rem] text-(--accent) hover:underline font-mono">
        View Trace →
      </a>
    {/if}
  </div>
  
  {#if result}
    <pre class="rounded-(--radius) border border-(--border) bg-(--code-bg) p-3 font-mono text-xs text-(--text) overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
  {/if}
  
  {#if error}
    <pre class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3 font-mono text-xs text-red-500 overflow-x-auto">{error}</pre>
  {/if}
</div>
