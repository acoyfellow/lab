<script lang="ts">
  import { onMount } from 'svelte';
  import { runSandbox, runKv, runChain, runSpawn, runGenerate, seedKv } from '../data.remote';
  import type { ChainStep } from '@acoyfellow/lab';

  type Mode = 'sandbox' | 'kv' | 'chain' | 'generate' | 'spawn';

  let mode = $state<Mode>('sandbox');
  let code = $state('return { hello: "world" }');
  let chainJson = $state(
    JSON.stringify(
      [
        { code: 'return [1, 2, 3]', capabilities: [] },
        { code: 'return input.map((n) => n * 2)', capabilities: [] },
      ] satisfies ChainStep[],
      null,
      2,
    ),
  );
  let prompt = $state('Return the sum of 1 through 10 as a number.');
  let depth = $state(2);
  let capKvRead = $state(false);
  let loading = $state(false);
  let seedMsg = $state<string | null>(null);
  let lastError = $state<string | null>(null);
  let lastTraceId = $state<string | null>(null);

  onMount(() => {
    const raw = sessionStorage.getItem('lab-fork');
    if (!raw) return;
    try {
      const f = JSON.parse(raw) as Record<string, unknown>;
      sessionStorage.removeItem('lab-fork');
      const m = f.mode;
      if (m === 'sandbox' || m === 'kv' || m === 'chain' || m === 'generate' || m === 'spawn') {
        mode = m;
      }
      if (typeof f.code === 'string') code = f.code;
      if (typeof f.prompt === 'string') prompt = f.prompt;
      if (typeof f.depth === 'number') depth = f.depth;
      if (Array.isArray(f.capabilities)) {
        const c = f.capabilities as string[];
        capKvRead = c.includes('kvRead');
      }
      if (Array.isArray(f.steps)) {
        chainJson = JSON.stringify(f.steps, null, 2);
      }
    } catch {
      sessionStorage.removeItem('lab-fork');
    }
  });

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
    try {
      let r;
      if (mode === 'sandbox') {
        r = await runSandbox(code);
      } else if (mode === 'kv') {
        r = await runKv(code);
      } else if (mode === 'chain') {
        const steps = JSON.parse(chainJson) as ChainStep[];
        if (!Array.isArray(steps)) throw new Error('Chain JSON must be an array of steps');
        r = await runChain(steps);
      } else if (mode === 'generate') {
        const capabilities: string[] = [];
        if (capKvRead) capabilities.push('kvRead');
        r = await runGenerate({ prompt, capabilities });
      } else {
        r = await runSpawn({
          code,
          capabilities: ['spawn'],
          depth,
        });
      }

      if (r.traceId) {
        lastTraceId = r.traceId;
      }
      if (!r.ok) {
        lastError = JSON.stringify(
          { error: r.error, reason: r.reason },
          null,
          2,
        );
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Compose - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16">
  <header class="mb-6">
    <h1 class="text-lg font-semibold tracking-tight">Compose</h1>
    <p class="text-[0.8125rem] text-(--text-2) mt-1 max-w-[50ch]">
      Run against the lab Worker from the browser. Each run returns a <code class="font-(family-name:--mono) text-[0.75rem]">traceId</code> when persisted.
    </p>
  </header>

  <div class="space-y-4">
    <div>
      <label for="compose-mode" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Mode</label>
      <select
        id="compose-mode"
        bind:value={mode}
        class="w-full max-w-xs border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem] text-(--text)"
      >
        <option value="sandbox">Sandbox (POST /run)</option>
        <option value="kv">KV read (POST /run/kv)</option>
        <option value="chain">Chain (POST /run/chain)</option>
        <option value="generate">Generate (POST /run/generate)</option>
        <option value="spawn">Spawn (POST /run/spawn)</option>
      </select>
    </div>

    {#if mode === 'kv'}
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onclick={seed}
          class="text-[0.8125rem] border border-(--border) rounded-(--radius) px-3 py-1.5 bg-(--surface) hover:bg-(--surface-alt) cursor-pointer"
        >Seed demo KV</button>
        {#if seedMsg}
          <span class="text-[0.8125rem] text-(--text-2)">{seedMsg}</span>
        {/if}
      </div>
    {/if}

    {#if mode === 'generate'}
      <div>
        <label for="compose-prompt" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Prompt</label>
        <textarea
          id="compose-prompt"
          bind:value={prompt}
          rows="4"
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-(family-name:--mono) text-xs text-(--text)"
        ></textarea>
      </div>
      <label class="flex items-center gap-2 text-[0.8125rem] text-(--text-2)">
        <input type="checkbox" bind:checked={capKvRead} />
        Grant <code class="font-(family-name:--mono) text-[0.75rem]">kvRead</code> to generated code
      </label>
    {:else if mode === 'chain'}
      <div>
        <label for="compose-chain" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Steps (JSON)</label>
        <textarea
          id="compose-chain"
          bind:value={chainJson}
          rows="12"
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-(family-name:--mono) text-xs text-(--text)"
        ></textarea>
      </div>
    {:else}
      <div>
        <label for="compose-code" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Code</label>
        <textarea
          id="compose-code"
          bind:value={code}
          rows="10"
          class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-(family-name:--mono) text-xs text-(--text)"
        ></textarea>
      </div>
      {#if mode === 'spawn'}
        <div>
          <label for="compose-depth" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">Max depth</label>
          <input
            id="compose-depth"
            type="number"
            bind:value={depth}
            min="1"
            max="8"
            class="w-24 border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-2 text-[0.8125rem]"
          />
        </div>
      {/if}
    {/if}

    <button
      type="button"
      onclick={run}
      disabled={loading}
      class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) cursor-pointer disabled:opacity-50"
    >{loading ? 'Running…' : 'Run'}</button>

    {#if lastTraceId}
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 text-[0.8125rem]">
        <div class="text-(--text-3) text-[0.6875rem] font-semibold uppercase tracking-wider mb-2">Trace</div>
        <a href="/t/{lastTraceId}" class="text-(--text) font-(family-name:--mono) text-xs underline underline-offset-2">/t/{lastTraceId}</a>
      </div>
    {/if}

    {#if lastError}
      <div class="rounded-(--radius) border border-(--cap-off-border) bg-(--cap-off-bg) p-4">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--cap-off-text) mb-2">Error</div>
        <pre class="font-(family-name:--mono) text-xs whitespace-pre-wrap text-(--text)">{lastError}</pre>
      </div>
    {/if}
  </div>
</div>
