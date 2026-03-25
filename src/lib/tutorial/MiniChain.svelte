<script lang="ts">
  import type { ChainStep, RunResult } from '@acoyfellow/lab';
  import { SIMPLE_CHAIN_STEPS } from '$lib/guest-code-fixtures';
  import { runChain, seedKv } from '../../routes/data.remote';
  import { CHAIN_STEPS_FOR_CURL } from '$lib/home-snippets';

  const simpleDefault = JSON.stringify(SIMPLE_CHAIN_STEPS, null, 2);

  let { kvTools = false }: { kvTools?: boolean } = $props();

  let chainJson = $state(simpleDefault);
  let loading = $state(false);
  let traceId = $state<string | null>(null);
  let error = $state<string | null>(null);
  let seedMsg = $state<string | null>(null);

  function resetSimple() {
    chainJson = simpleDefault;
    error = null;
    traceId = null;
  }

  function loadKvExample() {
    chainJson = JSON.stringify(
      CHAIN_STEPS_FOR_CURL.map((s) => ({
        name: s.name,
        body: s.body,
        capabilities: [...s.capabilities],
      })),
      null,
      2,
    );
    error = null;
    traceId = null;
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
    error = null;
    traceId = null;
    try {
      let steps: ChainStep[];
      try {
        steps = JSON.parse(chainJson) as ChainStep[];
      } catch {
        throw new Error('Invalid JSON — expect an array of { body, capabilities }.');
      }
      if (!Array.isArray(steps)) throw new Error('Body must be an array of steps');
      const r: RunResult = await runChain(steps);
      if (r.traceId) traceId = r.traceId;
      if (!r.ok) {
        error = JSON.stringify({ error: r.error, reason: r.reason }, null, 2);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
</script>

<div
  class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-3"
  aria-label="Run a chain on this page"
>
  <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
    Try it · POST /run/chain
  </div>

  {#if kvTools}
    <div class="flex flex-wrap items-center gap-2 text-[0.8125rem] text-(--text-2)">
      <button
        type="button"
        onclick={seed}
        class="border border-(--border) rounded-(--radius) px-3 py-1.5 bg-(--surface-alt) hover:bg-(--surface) cursor-pointer"
      >Seed demo KV</button>
      {#if seedMsg}<span>{seedMsg}</span>{/if}
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        onclick={resetSimple}
        class="text-[0.8125rem] border border-(--border) rounded-(--radius) px-3 py-1.5 bg-(--code-bg) cursor-pointer"
      >Preset: simple map</button>
      <button
        type="button"
        onclick={loadKvExample}
        class="text-[0.8125rem] border border-(--border) rounded-(--radius) px-3 py-1.5 bg-(--code-bg) cursor-pointer"
      >Preset: KV roll call</button>
    </div>
  {/if}

  <textarea
    bind:value={chainJson}
    rows="12"
    class="w-full border border-(--border) rounded-(--radius) bg-(--code-bg) p-3 font-(family-name:--mono) text-xs text-(--text)"
    spellcheck="false"
  ></textarea>
  <button
    type="button"
    onclick={run}
    disabled={loading}
    class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) cursor-pointer disabled:opacity-50"
  >
    {loading ? 'Running…' : 'Run chain'}
  </button>
  {#if traceId}
    <p class="m-0 text-[0.8125rem] text-(--text-2)">
      Trace:
      <a href="/t/{traceId}" class="font-(family-name:--mono) text-xs text-(--text) underline underline-offset-2"
        >/t/{traceId}</a
      >
      <span class="text-(--text-3)"> · open it for per-step detail</span>
    </p>
  {/if}
  {#if error}
    <pre
      class="m-0 font-(family-name:--mono) text-xs whitespace-pre-wrap text-(--cap-off-text) bg-(--cap-off-bg) border border-(--cap-off-border) rounded-(--radius) p-3"
    >{error}</pre>
  {/if}
</div>
