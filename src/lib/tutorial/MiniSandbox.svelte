<script lang="ts">
  import type { RunResult } from '@acoyfellow/lab';
  import { runSandbox } from '../../routes/data.remote';

  let code = $state('return { ok: true, value: 1 + 1 }');
  let loading = $state(false);
  let traceId = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function run() {
    loading = true;
    error = null;
    traceId = null;
    try {
      const r: RunResult = await runSandbox({ body: code, capabilities: [] });
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
  aria-label="Run sandbox code on this page"
>
  <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
    Try it · POST /run
  </div>
  <textarea
    bind:value={code}
    rows="5"
    class="w-full border border-(--border) rounded-(--radius) bg-(--code-bg) p-3 font-(family-name:--mono) text-xs text-(--text)"
    spellcheck="false"
  ></textarea>
  <button
    type="button"
    onclick={run}
    disabled={loading}
    class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) cursor-pointer disabled:opacity-50"
  >
    {loading ? 'Running…' : 'Run'}
  </button>
  {#if traceId}
    <p class="m-0 text-[0.8125rem] text-(--text-2)">
      Trace:
      <a href="/t/{traceId}" class="font-(family-name:--mono) text-xs text-(--text) underline underline-offset-2"
        >/t/{traceId}</a
      >
    </p>
  {/if}
  {#if error}
    <pre
      class="m-0 font-(family-name:--mono) text-xs whitespace-pre-wrap text-(--cap-off-text) bg-(--cap-off-bg) border border-(--cap-off-border) rounded-(--radius) p-3"
    >{error}</pre>
  {/if}
</div>
