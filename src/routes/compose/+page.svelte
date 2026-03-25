<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import AutoResizeTextarea from '$lib/AutoResizeTextarea.svelte';
  import { EditorTabs, ResponsePanel } from '$lib/compose';
  import { Button } from '$lib/components/ui/button';
  import { runSandbox, runKv, runChain, runSpawn, runGenerate, seedKv } from '../data.remote';
  import type { ChainStep } from '@acoyfellow/lab';
  import { SIMPLE_CHAIN_STEPS, JSON_HEALER_STEPS } from '$lib/guest-code-fixtures';
  import {
    GUEST_TEMPLATE_DEFAULT,
    GUEST_TEMPLATE_IDS,
    type GuestTemplateId,
  } from '$lib/guest-templates';

  type Mode = 'sandbox' | 'kv' | 'chain' | 'generate' | 'spawn';

  let mode = $state<Mode>('chain');
  let guestTemplate = $state<GuestTemplateId>(GUEST_TEMPLATE_DEFAULT);
  let code = $state('return { hello: "world" }');
  let chainJson = $state(JSON.stringify(SIMPLE_CHAIN_STEPS, null, 2));
  let prompt = $state('Return the sum of 1 through 10 as a number.');
  let depth = $state(2);
  let capKvRead = $state(false);
  let capWorkersAi = $state(false);
  let capR2Read = $state(false);
  let capD1Read = $state(false);
  let capDurableObjectFetch = $state(false);
  let capContainerHttp = $state(false);
  let loading = $state(false);
  let seedMsg = $state<string | null>(null);
  let lastError = $state<string | null>(null);
  let lastTraceId = $state<string | null>(null);
  let lastResult = $state<unknown>(null);
  let lastSteps = $state<Array<{name: string; status: 'success' | 'error'; ms: number}>>([]);
  let editorView = $state<'builder' | 'raw'>('raw');

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const exampleId = urlParams.get('example');
    if (exampleId === 'json-healer') {
      mode = 'chain';
      chainJson = JSON.stringify(JSON_HEALER_STEPS, null, 2);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    
    const raw = sessionStorage.getItem('lab-fork');
    if (!raw) return;
    try {
      const f = JSON.parse(raw) as Record<string, unknown>;
      sessionStorage.removeItem('lab-fork');
      const m = f.mode;
      if (m === 'sandbox' || m === 'kv' || m === 'chain' || m === 'generate' || m === 'spawn') {
        mode = m;
      }
      if (typeof f.body === 'string') code = f.body;
      else if (typeof f.code === 'string') code = f.code;
      if (
        typeof f.template === 'string' &&
        (GUEST_TEMPLATE_IDS as readonly string[]).includes(f.template)
      ) {
        guestTemplate = f.template as GuestTemplateId;
      }
      if (typeof f.prompt === 'string') prompt = f.prompt;
      if (typeof f.depth === 'number') depth = f.depth;
      if (Array.isArray(f.capabilities)) {
        const c = f.capabilities as string[];
        capKvRead = c.includes('kvRead');
        capWorkersAi = c.includes('workersAi');
        capR2Read = c.includes('r2Read');
        capD1Read = c.includes('d1Read');
        capDurableObjectFetch = c.includes('durableObjectFetch');
        capContainerHttp = c.includes('containerHttp');
      }
      if (Array.isArray(f.steps)) {
        chainJson = JSON.stringify(f.steps, null, 2);
      }
    } catch {
      sessionStorage.removeItem('lab-fork');
    }
  });

  function guestCaps(): string[] {
    const c: string[] = [];
    if (capWorkersAi) c.push('workersAi');
    if (capR2Read) c.push('r2Read');
    if (capD1Read) c.push('d1Read');
    if (capDurableObjectFetch) c.push('durableObjectFetch');
    if (capContainerHttp) c.push('containerHttp');
    return c;
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

  async function run() {
    loading = true;
    lastError = null;
    lastTraceId = null;
    lastResult = null;
    lastSteps = [];
    try {
      let r;
      if (mode === 'sandbox') {
        r = await runSandbox({
          body: code,
          capabilities: guestCaps(),
          template: guestTemplate,
        });
      } else if (mode === 'kv') {
        r = await runKv({
          body: code,
          capabilities: guestCaps(),
          template: guestTemplate,
        });
      } else if (mode === 'chain') {
        let steps: ChainStep[];
        try {
          steps = JSON.parse(chainJson) as ChainStep[];
        } catch {
          throw new Error(
            'Invalid JSON in Steps. Use an array of { body, capabilities } objects.',
          );
        }
        if (!Array.isArray(steps)) throw new Error('Chain JSON must be an array of steps');
        r = await runChain(steps);
      } else if (mode === 'generate') {
        const capabilities: string[] = [...guestCaps()];
        if (capKvRead) capabilities.push('kvRead');
        r = await runGenerate({ prompt, capabilities, template: guestTemplate });
      } else {
        r = await runSpawn({
          body: code,
          capabilities: ['spawn', ...guestCaps()],
          depth,
          template: guestTemplate,
        });
      }

      if (r.traceId) {
        lastTraceId = r.traceId;
      }
      if (r.ok) {
        lastResult = r.result;
      } else {
        lastError = JSON.stringify(
          { error: r.error, reason: r.reason },
          null,
          2,
        );
      }

      if (r.trace && Array.isArray(r.trace)) {
        lastSteps = r.trace.map((step, i) => ({
          name: step.name || `Step ${i + 1}`,
          status: 'success' as const,
          ms: step.ms || 0
        }));
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
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
  description="Run code in sandbox/KV/chain/spawn/generate modes and get a shareable trace ID for every execution."
  path="/compose"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-8 max-sm:px-4 space-y-6">
  <header class="space-y-1">
    <h1 class="text-lg font-semibold tracking-tight">Compose</h1>
    <p class="text-[0.8125rem] text-(--text-2)">Build and run chainable steps with explicit capabilities.</p>
  </header>

  <div class="space-y-6">
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex-1 min-w-[200px]">
        <label for="compose-mode" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Mode</label>
        <select
          id="compose-mode"
          bind:value={mode}
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem] text-(--text)"
        >
          <option value="chain">Chain (multiple steps)</option>
          <option value="sandbox">Sandbox (single run)</option>
          <option value="kv">KV read</option>
          <option value="generate">Generate (AI)</option>
          <option value="spawn">Spawn (nested)</option>
        </select>
      </div>

      <Button onclick={run} disabled={loading} class="min-w-[100px]">
        {loading ? 'Running…' : 'Run'}
      </Button>
    </div>

    {#if mode === 'kv'}
      <div class="flex items-center gap-3">
        <Button onclick={seed} variant="outline" class="text-xs">
          Seed demo KV
        </Button>
        {#if seedMsg}
          <span class="text-[0.75rem] text-(--text-2)">{seedMsg}</span>
        {/if}
      </div>
    {/if}

    <div class="border-t border-(--border) pt-6">
      {#if mode === 'chain'}
        <EditorTabs bind:view={editorView} bind:chainJson disabled={loading} />
      {:else if mode === 'generate'}
        <div class="space-y-4">
          <div>
            <label for="gen-prompt" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Prompt</label>
            <AutoResizeTextarea id="gen-prompt" bind:value={prompt} minRows={4} maxRows={20} />
          </div>
          <fieldset class="border border-(--border) rounded-(--radius) p-3 space-y-1.5 text-[0.8125rem] text-(--text-2)">
            <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Capabilities</legend>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capWorkersAi} /><code class="font-mono text-[0.7rem]">workersAi</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capR2Read} /><code class="font-mono text-[0.7rem]">r2Read</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capD1Read} /><code class="font-mono text-[0.7rem]">d1Read</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capDurableObjectFetch} /><code class="font-mono text-[0.7rem]">durableObjectFetch</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capContainerHttp} /><code class="font-mono text-[0.7rem]">containerHttp</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capKvRead} /><code class="font-mono text-[0.7rem]">kvRead</code></label>
            </div>
          </fieldset>
        </div>
      {:else}
        <div class="space-y-4">
          <div>
            <label for="guest-template" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Template</label>
            <select
              id="guest-template"
              bind:value={guestTemplate}
              class="w-full max-w-xs border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem] text-(--text) font-mono"
            >
              {#each GUEST_TEMPLATE_IDS as tid (tid)}
                <option value={tid}>{tid}</option>
              {/each}
            </select>
          </div>
          <fieldset class="border border-(--border) rounded-(--radius) p-3 space-y-1.5 text-[0.8125rem] text-(--text-2)">
            <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Capabilities</legend>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capWorkersAi} /><code class="font-mono text-[0.7rem]">workersAi</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capR2Read} /><code class="font-mono text-[0.7rem]">r2Read</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capD1Read} /><code class="font-mono text-[0.7rem]">d1Read</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capDurableObjectFetch} /><code class="font-mono text-[0.7rem]">durableObjectFetch</code></label>
              <label class="flex items-center gap-2"><input type="checkbox" bind:checked={capContainerHttp} /><code class="font-mono text-[0.7rem]">containerHttp</code></label>
            </div>
          </fieldset>
          <div>
            <label for="guest-code" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Code</label>
            <AutoResizeTextarea id="guest-code" bind:value={code} minRows={10} maxRows={30} />
          </div>
          {#if mode === 'spawn'}
            <div>
              <label for="max-depth" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Max depth</label>
              <input
                id="max-depth"
                type="number"
                bind:value={depth}
                min="1"
                max="8"
                class="w-24 border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem]"
              />
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="border-t border-(--border) pt-6">
      <ResponsePanel
        status={loading ? 'loading' : lastError ? 'error' : lastTraceId ? 'success' : 'idle'}
        traceId={lastTraceId}
        result={lastResult}
        steps={lastSteps}
        error={lastError}
      />
    </div>
  </div>
</div>