<script lang="ts">
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
  import { Check, Circle, X } from '@lucide/svelte';

  type StepStatus = 'pending' | 'success' | 'error';

  interface Step {
    name: string;
    status: StepStatus;
    ms: number;
  }

  let {
    status = 'idle' as 'idle' | 'loading' | 'success' | 'error',
    traceId = null as string | null,
    result = null as unknown,
    steps = [] as Step[],
    error = null as string | null
  } = $props();

  function statusColor(s: StepStatus): string {
    switch (s) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-(--text-3)';
    }
  }

</script>

<div class="h-full flex flex-col">
  {#if status === 'idle'}
    <Card class="h-full flex items-center justify-center border-dashed">
      <CardContent class="text-center py-12">
        <p class="text-(--text-3) text-sm">Click <strong>Run</strong> to see output</p>
        <p class="text-(--text-3) text-xs mt-2">Or press Cmd+Enter</p>
      </CardContent>
    </Card>
  {:else if status === 'loading'}
    <Card class="h-full flex items-center justify-center">
      <CardContent class="text-center">
        <p class="text-(--text-2) text-sm">Running…</p>
      </CardContent>
    </Card>
  {:else if status === 'error'}
    <Card class="border-red-500/50 bg-red-500/5">
      <CardHeader class="pb-2">
        <CardTitle class="text-red-500 text-sm">Error</CardTitle>
      </CardHeader>
      <CardContent>
        <pre class="text-xs font-mono whitespace-pre-wrap text-(--text)">{error}</pre>
        <p class="mt-3 mb-0 text-[0.75rem] text-(--text-3)">
          <AppLink to={paths.docsHttpApi} class="underline underline-offset-2 hover:text-(--text)">HTTP API</AppLink>
          — request shapes and run modes.
        </p>
      </CardContent>
    </Card>
  {:else}
    <Card>
      <CardHeader class="pb-2">
        <div class="flex items-center justify-between">
          <CardTitle class="text-sm text-green-500 flex items-center gap-2">
            <Check class="w-4 h-4" />
            Success
          </CardTitle>
          {#if traceId}
            <AppLink to={`/t/${traceId}`} class="text-xs text-(--accent) underline underline-offset-2 hover:text-(--accent-alt)">
              View full trace →
            </AppLink>
          {/if}
        </div>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if steps.length > 0}
          <div class="space-y-1.5">
            {#each steps as step, i}
              <div class="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-(--surface-alt)">
                {#if step.status === 'success'}
                  <Check class={`w-3.5 h-3.5 ${statusColor(step.status)}`} />
                {:else if step.status === 'error'}
                  <X class={`w-3.5 h-3.5 ${statusColor(step.status)}`} />
                {:else}
                  <Circle class={`w-3.5 h-3.5 ${statusColor(step.status)}`} />
                {/if}
                <span class="text-(--text-2)">Step {i + 1}</span>
                {#if step.name}
                  <span class="text-(--text-3) truncate flex-1">{step.name}</span>
                {/if}
                <span class="text-(--text-3) font-mono">{step.ms}ms</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if result !== null && result !== undefined}
          <details class="group" open>
            <summary class="text-xs text-(--text-3) cursor-pointer hover:text-(--text) select-none">
              Output
              <span class="opacity-60 group-open:rotate-180 inline-block transition-transform">▼</span>
            </summary>
            <pre class="mt-2 p-3 bg-(--surface-alt) rounded text-xs font-mono overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
          </details>
        {/if}
      </CardContent>
    </Card>
  {/if}
</div>