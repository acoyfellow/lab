<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { ResponsePanel } from '$lib/compose';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { runSandbox, runKv, runChain, runSpawn, runGenerate, seedKv } from '../data.remote';
  import type { ChainStep } from '@acoyfellow/lab';
  import { SIMPLE_CHAIN_STEPS } from '$lib/guest-code-fixtures';
  import { ChainBuilder } from '$lib/compose';
  import PlayIcon from '@lucide/svelte/icons/play';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';

  type ExecutionMode = 'once' | 'chain' | 'spawn' | 'generate';

  const CAPABILITIES = [
    { id: 'kvRead', label: 'kvRead' },
    { id: 'spawn', label: 'spawn' },
    { id: 'workersAi', label: 'workersAi' },
    { id: 'r2Read', label: 'r2Read' },
    { id: 'd1Read', label: 'd1Read' },
    { id: 'durableObjectFetch', label: 'durableObjectFetch' },
    { id: 'containerHttp', label: 'containerHttp' },
  ];

  let mode = $state<ExecutionMode>('once');
  let inputType = $state<'code' | 'prompt'>('code');
  let code = $state('return { hello: "world" }');
  let prompt = $state('Return the sum of 1 through 10 as a number.');
  let chainJson = $state(JSON.stringify(SIMPLE_CHAIN_STEPS, null, 2));
  let depth = $state(2);
  let capabilities = $state<string[]>([]);
  let loading = $state(false);
  let seedMsg = $state<string | null>(null);
  let lastError = $state<string | null>(null);
  let lastTraceId = $state<string | null>(null);
  let lastResult = $state<unknown>(null);
  let lastSteps = $state<Array<{name: string; status: 'success' | 'error'; ms: number}>>([]);
  let chainResetKey = $state(0);

  onMount(() => {
    const raw = sessionStorage.getItem('lab-fork');
    if (!raw) return;
    try {
      const f = JSON.parse(raw) as Record<string, unknown>;
      sessionStorage.removeItem('lab-fork');
      if (typeof f.body === 'string') code = f.body;
      else if (typeof f.code === 'string') code = f.code;
      if (typeof f.prompt === 'string') {
        prompt = f.prompt;
        inputType = 'prompt';
      }
      if (typeof f.depth === 'number') depth = f.depth;
      if (Array.isArray(f.capabilities)) capabilities = f.capabilities as string[];
      if (Array.isArray(f.steps)) {
        chainJson = JSON.stringify(f.steps, null, 2);
        mode = 'chain';
        inputType = 'code';
      }
      chainResetKey++;
    } catch {
      sessionStorage.removeItem('lab-fork');
    }
  });

  function guestCaps(): string[] {
    return capabilities;
  }

  async function run() {
    loading = true;
    lastError = null;
    lastTraceId = null;
    lastResult = null;
    lastSteps = [];
    try {
      let r;
      if (mode === 'generate') {
        r = await runGenerate({
          prompt,
          capabilities: guestCaps(),
          template: 'guest@v1',
        });
      } else if (mode === 'chain') {
        let steps: ChainStep[];
        try {
          steps = JSON.parse(chainJson);
          if (!Array.isArray(steps) || steps.length === 0) throw new Error('Invalid chain');
        } catch (e) {
          lastError = 'Invalid chain JSON: ' + (e instanceof Error ? e.message : String(e));
          loading = false;
          return;
        }
        r = await runChain(steps);
      } else if (mode === 'spawn') {
        r = await runSpawn({
          body: code,
          capabilities: [...guestCaps(), 'spawn'],
          depth,
          template: 'guest@v1',
        });
      } else {
        // once (sandbox/kv)
        const hasKvRead = capabilities.includes('kvRead');
        if (hasKvRead) {
          r = await runKv({
            body: code,
            capabilities: guestCaps(),
            template: 'guest@v1',
          });
        } else {
          r = await runSandbox({
            body: code,
            capabilities: guestCaps(),
            template: 'guest@v1',
          });
        }
      }

      if (!r.ok) {
        lastError = JSON.stringify(r.error ?? r.reason ?? 'Unknown error', null, 2);
        lastTraceId = r.traceId ?? null;
        loading = false;
        return;
      }

      lastTraceId = r.traceId ?? null;
      lastResult = r.result ?? null;
      if (mode === 'chain' && r.trace && Array.isArray(r.trace)) {
        lastSteps = r.trace.map((t: any) => ({
          name: t.name || `Step ${t.step + 1}`,
          status: t.error ? 'error' : 'success',
          ms: t.ms || 0,
        }));
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function seed() {
    seedMsg = null;
    try {
      const r = await seedKv(undefined);
      seedMsg = r.ok ? `Seeded ${r.seeded} keys` : 'Seed failed';
    } catch (e) {
      seedMsg = e instanceof Error ? e.message : 'Seed failed';
    }
  }

  function toggleCapability(capId: string) {
    if (capabilities.includes(capId)) {
      capabilities = capabilities.filter(c => c !== capId);
    } else {
      capabilities = [...capabilities, capId];
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
      e.preventDefault();
      run();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<SEO
  title="Compose — lab"
  description="Chain isolates with explicit capabilities — every run yields a shareable trace."
  path="/compose"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-8 max-sm:px-4 space-y-6">
  <header class="space-y-1">
    <h1 class="text-lg font-semibold tracking-tight">Compose</h1>
    <p class="text-[0.8125rem] text-(--text-2)">
      Build a chain, pick capabilities, execute. Every run produces a trace you can share or hand off.
    </p>
  </header>

  {#if mode !== 'chain'}
    <div class="space-y-2">
      <div class="flex items-center gap-4">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
          Input
        </span>
        <div class="flex items-center gap-1 text-[0.75rem]">
          <button
            type="button"
            onclick={() => inputType = 'code'}
            class="px-2 py-1 rounded transition-colors {inputType === 'code' ? 'bg-(--accent) text-white' : 'text-(--text-2) hover:bg-(--surface-alt)'}"
          >
            Code
          </button>
          <button
            type="button"
            onclick={() => inputType = 'prompt'}
            class="px-2 py-1 rounded transition-colors {inputType === 'prompt' ? 'bg-(--accent) text-white' : 'text-(--text-2) hover:bg-(--surface-alt)'}"
          >
            Prompt (AI)
          </button>
        </div>
      </div>

      {#if inputType === 'code'}
        <Textarea bind:value={code} class="min-h-[200px] font-mono text-xs bg-white" placeholder={`return { hello: "world" }`} />
      {:else}
        <Textarea bind:value={prompt} class="min-h-[100px] font-mono text-xs bg-white" placeholder="Describe what you want the AI to generate..." />
      {/if}
    </div>
  {/if}

  <details class="border border-(--border) rounded-(--radius) bg-white group">
    <summary class="flex items-center justify-between px-3 py-2 cursor-pointer text-[0.8125rem] text-(--text-2) hover:text-(--text) select-none list-none">
      <span class="text-[0.6875rem] font-semibold uppercase tracking-wider">Capabilities</span>
      <span class="flex items-center gap-2">
        {#if capabilities.length > 0}
          <span class="text-[0.75rem] text-(--text-3)">{capabilities.length} enabled</span>
        {/if}
        <span class="transition-transform duration-200 group-open:rotate-180">▼</span>
      </span>
    </summary>
    <div class="px-3 pb-3 border-t border-(--border)">
      <div class="flex flex-wrap gap-2 pt-2">
        {#each CAPABILITIES as cap}
          <label class="inline-flex items-center gap-1.5 text-[0.8125rem] text-(--text-2) cursor-pointer rounded px-2 py-1 bg-(--surface-alt) hover:bg-(--border) transition-colors">
            <input
              type="checkbox"
              checked={capabilities.includes(cap.id)}
              onchange={() => toggleCapability(cap.id)}
              class="accent-(--accent)"
            />
            <code class="font-mono text-[0.7rem]">{cap.label}</code>
          </label>
        {/each}
      </div>
    </div>
  </details>

  <div class="space-y-2">
    <label for="exec-mode" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block">
      Execution mode
    </label>
    <select
      id="exec-mode"
      bind:value={mode}
      class="w-full border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem]"
    >
      <option value="once">Run once</option>
      <option value="chain">Chain multiple steps</option>
      <option value="spawn">Spawn nested isolates</option>
      <option value="generate">Generate with AI</option>
    </select>

    {#if mode === 'chain'}
      <div class="pt-2">
        <ChainBuilder bind:chainJson disabled={loading} />
      </div>
    {:else if mode === 'spawn'}
      <div class="pt-2">
        <label for="max-depth" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">
          Max depth
        </label>
        <input
          id="max-depth"
          type="number"
          bind:value={depth}
          min="1"
          max="8"
          class="w-24 border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem]"
        />
      </div>
    {:else if mode === 'generate'}
      <div class="pt-2 text-[0.75rem] text-(--text-2)">
        AI writes the code from your prompt, then runs it in an isolate.
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
    <p class="text-[0.75rem] text-(--text-3) m-0">
      Press <kbd class="px-1.5 py-0.5 rounded bg-(--surface-alt) font-mono text-[0.7rem]">Cmd+Enter</kbd> to run
    </p>
    <Button onclick={run} disabled={loading} class="min-w-[120px]" size="lg">
      {loading ? 'Running…' : 'Run'}
      {#if loading}
        <Loader2Icon class="w-4 h-4 animate-spin" />
      {:else}
        <PlayIcon class="w-4 h-4" />
      {/if}
    </Button>
  </div>

  {#if capabilities.includes('kvRead')}
    <div class="flex items-center gap-3">
      <Button onclick={seed} variant="outline" class="text-xs">
        Seed demo KV
      </Button>
      {#if seedMsg}
        <span class="text-[0.75rem] text-(--text-2)">{seedMsg}</span>
      {/if}
    </div>
  {/if}

  <ResponsePanel
    status={loading ? 'loading' : lastError ? 'error' : lastTraceId ? 'success' : 'idle'}
    traceId={lastTraceId}
    result={lastResult}
    steps={lastSteps}
    error={lastError}
  />
</div>
