<script lang="ts">
  import type { RunResult } from '@acoyfellow/lab';
  import { runChain } from '$lib/api';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Button } from '$lib/components/ui/button';
  import { goto } from '$app/navigation';

  let steps = $state([
    {
      name: 'Generate data',
      body: 'return { users: [{name: "Alice"}, {name: "Bob"}], count: 2 }',
      capabilities: [] as string[]
    },
    {
      name: 'Transform', 
      body: 'return input.users.map(u => u.name.toUpperCase())',
      capabilities: [] as string[]
    },
    {
      name: 'Format result',
      body: 'return { names: input, total: input.length, timestamp: Date.now() }',
      capabilities: [] as string[]
    }
  ]);
  
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

<div class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-4">
  <div class="flex items-center justify-between">
    <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Try It · 3-Step Chain
    </div>
    <button onclick={openInCompose} class="text-[0.8125rem] text-(--accent) hover:underline bg-transparent border-none cursor-pointer">Open in Compose →</button>
  </div>
  
  <div class="space-y-3">
    {#each steps as step, i}
      <div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-3">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs text-(--text-3) font-mono">Step {i + 1}</span>
          <span class="text-sm font-medium text-(--text)">{step.name}</span>
        </div>
        <Textarea
          bind:value={step.body}
          class="min-h-[60px] font-mono text-xs text-(--text) bg-(--code-bg)"
        />
      </div>
    {/each}
  </div>
  
  <div class="flex items-center gap-3">
    <Button onclick={run} disabled={loading} size="sm">
      {loading ? 'Running…' : 'Run Chain'}
    </Button>
    
    {#if result?.traceId}
      <a href="/t/{result.traceId}" class="text-[0.8125rem] text-(--accent) hover:underline font-mono">
        View Trace →
      </a>
    {/if}
  </div>
  
  {#if result?.ok && result.result}
    <div class="rounded-(--radius) border border-green-500/30 bg-green-500/5 p-3">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-green-600 mb-1">Result</div>
      <pre class="font-mono text-xs text-(--text) overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
    </div>
  {/if}
  
  {#if error}
    <div class="rounded-(--radius) border border-red-500/30 bg-red-500/5 p-3">
      <pre class="font-mono text-xs text-red-500 overflow-x-auto">{error}</pre>
    </div>
  {/if}
</div>