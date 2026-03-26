<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { EditorTabs, ResponsePanel } from '$lib/compose';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { runSandbox, runKv, runChain, runSpawn, runGenerate, seedKv } from '../data.remote';
  import type { ChainStep } from '@acoyfellow/lab';
  import { SIMPLE_CHAIN_STEPS, JSON_HEALER_STEPS, API_RETRY_STEPS, WEBHOOK_VALIDATOR_STEPS, DATA_TRANSFORMER_STEPS, MULTI_SOURCE_AGGREGATOR_STEPS } from '$lib/guest-code-fixtures';
  import {
    GUEST_TEMPLATE_DEFAULT,
    GUEST_TEMPLATE_IDS,
    type GuestTemplateId,
  } from '$lib/guest-templates';

  type Mode = 'sandbox' | 'kv' | 'chain' | 'generate' | 'spawn';

  const GUEST_CAP_BASE = [
    'workersAi',
    'r2Read',
    'd1Read',
    'durableObjectFetch',
    'containerHttp',
  ] as const;
  const GUEST_CAP_IDS = [...GUEST_CAP_BASE, 'kvRead'] as const;
  type GuestCapId = (typeof GUEST_CAP_IDS)[number];

  function defaultGuestCapFlags(): Record<GuestCapId, boolean> {
    return Object.fromEntries(GUEST_CAP_IDS.map((id) => [id, false])) as Record<GuestCapId, boolean>;
  }

  let mode = $state<Mode>('chain');
  let guestTemplate = $state<GuestTemplateId>(GUEST_TEMPLATE_DEFAULT);
  let code = $state('return { hello: "world" }');
  let chainJson = $state(JSON.stringify(SIMPLE_CHAIN_STEPS, null, 2));
  let prompt = $state('Return the sum of 1 through 10 as a number.');
  let depth = $state(2);
  let guestCapFlags = $state(defaultGuestCapFlags());
  let loading = $state(false);
  let seedMsg = $state<string | null>(null);
  let lastError = $state<string | null>(null);
  let lastTraceId = $state<string | null>(null);
  let lastResult = $state<unknown>(null);
  let lastSteps = $state<Array<{name: string; status: 'success' | 'error'; ms: number}>>([]);
  let editorView = $state<'builder' | 'raw'>('builder');
  let chainResetKey = $state(0);

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const exampleId = urlParams.get('example');
    if (exampleId === 'json-healer') {
      mode = 'chain';
      chainJson = JSON.stringify(JSON_HEALER_STEPS, null, 2);
      chainResetKey++;
      window.history.replaceState({}, '', window.location.pathname);
      return;
    } else if (exampleId === 'api-retry') {
      mode = 'chain';
      chainJson = JSON.stringify(API_RETRY_STEPS, null, 2);
      chainResetKey++;
      window.history.replaceState({}, '', window.location.pathname);
      return;
    } else if (exampleId === 'webhook-validator') {
      mode = 'chain';
      chainJson = JSON.stringify(WEBHOOK_VALIDATOR_STEPS, null, 2);
      chainResetKey++;
      window.history.replaceState({}, '', window.location.pathname);
      return;
    } else if (exampleId === 'data-transformer') {
      mode = 'chain';
      chainJson = JSON.stringify(DATA_TRANSFORMER_STEPS, null, 2);
      chainResetKey++;
      window.history.replaceState({}, '', window.location.pathname);
      return;
    } else if (exampleId === 'multi-source-aggregator') {
      mode = 'chain';
      chainJson = JSON.stringify(MULTI_SOURCE_AGGREGATOR_STEPS, null, 2);
      chainResetKey++;
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
        guestCapFlags = Object.fromEntries(
          GUEST_CAP_IDS.map((id) => [id, c.includes(id)]),
        ) as Record<GuestCapId, boolean>;
      }
      if (Array.isArray(f.steps)) {
        chainJson = JSON.stringify(f.steps, null, 2);
      }
      chainResetKey++;
    } catch {
      sessionStorage.removeItem('lab-fork');
    }
  });

  function guestCaps(): string[] {
    return GUEST_CAP_IDS.filter((id) => guestCapFlags[id]);
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
          steps = JSON.parse(chainJson);
          if (!Array.isArray(steps) || steps.length === 0) throw new Error('Invalid chain');
        } catch (e) {
          lastError = 'Invalid chain JSON: ' + (e instanceof Error ? e.message : String(e));
          loading = false;
          return;
        }
        r = await runChain(steps);
      } else if (mode === 'generate') {
        r = await runGenerate({
          prompt,
          capabilities: guestCaps(),
          template: guestTemplate,
        });
      } else if (mode === 'spawn') {
        const caps = [...guestCaps(), 'spawn'];
        r = await runSpawn({
          body: code,
          capabilities: caps,
          depth,
          template: guestTemplate,
        });
      } else {
        lastError = 'Unknown mode';
        loading = false;
        return;
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

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
      e.preventDefault();
      run();
    }
  }

  function presetChain() {
    mode = 'chain';
    chainJson = JSON.stringify(SIMPLE_CHAIN_STEPS, null, 2);
    chainResetKey++;
  }

  function presetSandbox() {
    mode = 'sandbox';
    code = 'return { hello: "world" }';
    guestTemplate = GUEST_TEMPLATE_DEFAULT;
  }

  function presetKv() {
    mode = 'kv';
    code = 'return { hello: "world" }';
    guestTemplate = GUEST_TEMPLATE_DEFAULT;
  }

  function presetGenerate() {
    mode = 'generate';
    prompt = 'Return the sum of 1 through 10 as a number.';
  }

  function presetSpawn() {
    mode = 'spawn';
    code = 'return { hello: "world" }';
    guestTemplate = GUEST_TEMPLATE_DEFAULT;
    depth = 2;
  }

  function modeClasses(m: Mode) {
    return mode === m ? 'border-(--accent)/35 bg-(--accent)/5' : 'border-(--border) bg-white';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<SEO
  title="Compose — lab"
  description="Chain isolated steps with explicit capabilities — every run yields a shareable trace."
  path="/compose"
  type="website"
/>

<div class="max-w-2xl mx-auto px-6 py-8 max-sm:px-4 space-y-6">
  <header class="space-y-1">
    <h1 class="text-lg font-semibold tracking-tight">Compose</h1>
    <p class="text-[0.8125rem] text-(--text-2)">
      Chain isolates with explicit capabilities — every run yields a shareable trace.
    </p>
  </header>

  <section aria-label="Start from a preset">
    <h2 class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) m-0 mb-3">
      Start from
    </h2>
    <div class="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onclick={presetChain}
        class="text-left rounded-(--radius) border px-3 py-3 transition-colors hover:bg-(--accent)/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) {modeClasses('chain')}"
      >
        <div class="text-sm font-semibold text-(--text)">Chain</div>
        <div class="text-[0.75rem] text-(--text-2) mt-0.5 leading-snug">Multi-step pipeline (recommended)</div>
      </button>
      <button
        type="button"
        onclick={presetSandbox}
        class="text-left rounded-(--radius) border px-3 py-3 transition-colors hover:border-(--text-3) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) {modeClasses('sandbox')}"
      >
        <div class="text-sm font-semibold text-(--text)">Sandbox</div>
        <div class="text-[0.75rem] text-(--text-2) mt-0.5 leading-snug">Single isolate, one run</div>
      </button>
      <button
        type="button"
        onclick={presetKv}
        class="text-left rounded-(--radius) border px-3 py-3 transition-colors hover:border-(--text-3) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) {modeClasses('kv')}"
      >
        <div class="text-sm font-semibold text-(--text)">KV read</div>
        <div class="text-[0.75rem] text-(--text-2) mt-0.5 leading-snug">Snapshot + guest kv API</div>
      </button>
      <button
        type="button"
        onclick={presetGenerate}
        class="text-left rounded-(--radius) border px-3 py-3 transition-colors hover:border-(--text-3) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) {modeClasses('generate')}"
      >
        <div class="text-sm font-semibold text-(--text)">Generate</div>
        <div class="text-[0.75rem] text-(--text-2) mt-0.5 leading-snug">Workers AI with caps</div>
      </button>
      <button
        type="button"
        onclick={presetSpawn}
        class="text-left rounded-(--radius) border px-3 py-3 sm:col-span-2 transition-colors hover:border-(--text-3) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) {modeClasses('spawn')}"
      >
        <div class="text-sm font-semibold text-(--text)">Spawn</div>
        <div class="text-[0.75rem] text-(--text-2) mt-0.5 leading-snug">Nested isolates with spawn capability</div>
      </button>
    </div>
  </section>

  <div class="space-y-4">
    {#if mode === 'chain'}
      <EditorTabs
        bind:view={editorView}
        bind:chainJson
        chainResetKey={chainResetKey}
        disabled={loading}
      />
    {:else if mode === 'generate'}
      <div class="space-y-4">
        <div>
          <label for="gen-prompt" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Prompt</label>
          <Textarea id="gen-prompt" bind:value={prompt} class="min-h-[100px] font-mono text-xs bg-white" />
        </div>
        <fieldset class="border border-(--border) rounded-(--radius) p-3 space-y-1.5 text-[0.8125rem] text-(--text-2) bg-white">
          <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Capabilities</legend>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {#each GUEST_CAP_IDS as id (id)}
              <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={guestCapFlags[id]} />
                <code class="font-mono text-[0.7rem]">{id}</code>
              </label>
            {/each}
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
            class="w-full max-w-xs border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem] text-(--text) font-mono"
          >
            {#each GUEST_TEMPLATE_IDS as tid (tid)}
              <option value={tid}>{tid}</option>
            {/each}
          </select>
        </div>
        <fieldset class="border border-(--border) rounded-(--radius) p-3 space-y-1.5 text-[0.8125rem] text-(--text-2) bg-white">
          <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Capabilities</legend>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {#each GUEST_CAP_BASE as id (id)}
              <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={guestCapFlags[id]} />
                <code class="font-mono text-[0.7rem]">{id}</code>
              </label>
            {/each}
          </div>
        </fieldset>
        <div>
          <label for="guest-code" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Code</label>
          <Textarea id="guest-code" bind:value={code} class="min-h-[200px] font-mono text-xs bg-white" />
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
              class="w-24 border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem]"
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center justify-between gap-4">
    <p class="text-[0.75rem] text-(--text-3) m-0">
      Current: <strong class="text-(--text) font-medium">{mode}</strong>
    </p>
    <Button onclick={run} disabled={loading} class="min-w-[120px]">
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

  <ResponsePanel
    status={loading ? 'loading' : lastError ? 'error' : lastTraceId ? 'success' : 'idle'}
    traceId={lastTraceId}
    result={lastResult}
    steps={lastSteps}
    error={lastError}
  />
</div>
