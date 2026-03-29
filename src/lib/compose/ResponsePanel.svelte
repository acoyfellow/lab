<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
  import { Check, Circle, X, Link2, ExternalLink } from '@lucide/svelte';

  type StepStatus = 'pending' | 'success' | 'error';

  interface Step {
    name: string;
    status: StepStatus;
    ms: number;
  }

  let {
    status = 'idle' as 'idle' | 'loading' | 'success' | 'error',
    resultId = null as string | null,
    result = null as unknown,
    steps = [] as Step[],
    error = null as string | null
  } = $props();

  const totalMs = $derived(
    steps.length ? steps.reduce((a, s) => a + s.ms, 0) : null
  );

  function statusColor(s: StepStatus): string {
    switch (s) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-(--text-3)';
    }
  }

  function traceUrl(): string {
    if (!resultId || typeof window === 'undefined') return '';
    return `${window.location.origin}/results/${resultId}`;
  }

  function copyTraceUrl() {
    const u = traceUrl();
    if (u) void navigator.clipboard.writeText(u);
  }
</script>

<div class="h-full flex flex-col">
  {#if status === 'idle'}
    <Card class="h-full flex items-center justify-center border-dashed border-(--border) bg-(--surface-alt)/30">
      <CardContent class="text-center py-10 px-4">
        <p class="text-(--text-3) text-sm m-0">Hit <strong class="text-(--text-2)">Run</strong> to execute and get a result URL</p>
        <p class="text-(--text-3) text-xs mt-1.5 m-0"><kbd class="px-1.5 py-0.5 rounded bg-(--surface) font-mono text-[0.7rem]">Cmd+Enter</kbd></p>
      </CardContent>
    </Card>
  {:else if status === 'loading'}
    <Card class="h-full min-h-[140px] flex items-center justify-center border-(--border) bg-(--surface)">
      <CardContent class="text-center">
        <p class="text-(--text-2) text-sm">Running…</p>
      </CardContent>
    </Card>
  {:else if status === 'error'}
    <Card class="border-red-500/40 bg-white shadow-sm shadow-red-500/20">
      <CardHeader class="pb-2">
        <CardTitle class="text-red-400 text-sm font-semibold">Run failed</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <pre class="text-xs font-mono whitespace-pre-wrap text-(--text) m-0">{error}</pre>
        {#if resultId}
          <p class="text-[0.75rem] text-(--text-2) m-0">
            The saved result still includes the top-level failure. Open it to review the saved result or share it for debugging.
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <a
              href="/results/{resultId}"
              class="inline-flex items-center gap-1.5 rounded-(--radius) bg-(--accent) px-3 py-2 text-xs font-medium text-white no-underline hover:opacity-90"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              Open saved result
            </a>
            <button
              type="button"
              onclick={copyTraceUrl}
              class="inline-flex items-center gap-1.5 rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-xs text-(--text) hover:bg-(--surface-alt)"
            >
              <Link2 class="w-3.5 h-3.5" />
              Copy result URL
            </button>
          </div>
          <p class="text-[0.65rem] font-mono text-(--text-3) m-0 break-all">{traceUrl()}</p>
        {/if}
        <p class="mt-2 mb-0 text-[0.75rem] text-(--text-3)">
          <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
          — request shapes.
        </p>
      </CardContent>
    </Card>
  {:else}
    <Card class="border-emerald-500/25 bg-white shadow-sm shadow-emerald-500/20">
      <CardHeader class="pb-2 space-y-2">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle class="text-sm text-emerald-500 flex items-center gap-2 m-0">
            <Check class="w-4 h-4 shrink-0" />
            Result ready
          </CardTitle>
          {#if resultId}
            <div class="flex flex-wrap gap-2">
              <a
                href="/results/{resultId}"
                class="inline-flex items-center gap-1.5 rounded-(--radius) bg-(--accent) px-3 py-2 text-xs font-medium text-white no-underline hover:opacity-90"
              >
                <ExternalLink class="w-3.5 h-3.5" />
                Open saved result
              </a>
              <button
                type="button"
                onclick={copyTraceUrl}
                class="inline-flex items-center gap-1.5 rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2 text-xs text-(--text) hover:bg-(--surface-alt)"
              >
                <Link2 class="w-3.5 h-3.5" />
                Copy result URL
              </button>
            </div>
          {/if}
        </div>
        {#if resultId}
          <p class="text-[0.75rem] text-(--text-2) m-0">
            Share this URL with another agent or a reviewer. It points to the saved result for the run.
          </p>
          <p class="text-[0.65rem] font-mono text-(--text-3) m-0 break-all leading-snug">{traceUrl()}</p>
        {/if}
        {#if steps.length > 0}
          <p class="text-[0.75rem] text-(--text-2) m-0">
            {steps.length} step{steps.length === 1 ? '' : 's'}
            {#if totalMs !== null}
              <span class="text-(--text-3)"> · {totalMs}ms total</span>
            {/if}
          </p>
        {/if}
      </CardHeader>
      <CardContent class="space-y-3 pt-0">
        {#if steps.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each steps as step, i}
              <div
                class="flex items-center gap-1.5 text-[0.6875rem] px-2 py-1 rounded-md bg-(--surface) border border-(--border)"
                title={step.name}
              >
                {#if step.status === 'success'}
                  <Check class={`w-3 h-3 shrink-0 ${statusColor(step.status)}`} />
                {:else if step.status === 'error'}
                  <X class={`w-3 h-3 shrink-0 ${statusColor(step.status)}`} />
                {:else}
                  <Circle class={`w-3 h-3 shrink-0 ${statusColor(step.status)}`} />
                {/if}
                <span class="text-(--text-2)">{i + 1}</span>
                {#if step.name}
                  <span class="text-(--text-3) truncate max-w-28">{step.name}</span>
                {/if}
                <span class="text-(--text-3) font-mono">{step.ms}ms</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if result !== null && result !== undefined}
          <div class="space-y-1">
            <div class="text-xs text-(--text-3)">Result</div>
            <pre
              class="p-3 bg-(--surface-alt) rounded-(--radius) border border-(--border) text-xs font-mono overflow-auto max-h-64"
            >{JSON.stringify(result, null, 2)}</pre>
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}
</div>
