<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import type { ChainStep } from '@acoyfellow/lab';

  let {
    chainJson = $bindable(''),
    disabled = false
  } = $props();

  const CAPABILITIES = [
    { id: 'kvRead', label: 'kvRead' },
    { id: 'spawn', label: 'spawn' },
    { id: 'workersAi', label: 'workersAi' },
    { id: 'r2Read', label: 'r2Read' },
    { id: 'd1Read', label: 'd1Read' },
    { id: 'durableObjectFetch', label: 'durableObjectFetch' },
    { id: 'containerHttp', label: 'containerHttp' },
  ];

  function parseSteps(j: string): { steps: ChainStep[]; error: string | null } {
    try {
      const p = JSON.parse(j || '[]');
      if (!Array.isArray(p)) {
        return { steps: [], error: 'Chain JSON must be an array' };
      }
      return { steps: p as ChainStep[], error: null };
    } catch {
      return { steps: [], error: 'Invalid JSON' };
    }
  }

  const initial = parseSteps(chainJson);
  let steps = $state<ChainStep[]>(initial.steps);
  let parseError = $state<string | null>(initial.error);
  let showAdvanced = $state<Record<number, boolean>>({});

  function syncToParent() {
    parseError = null;
    chainJson = JSON.stringify(steps, null, 2);
  }

  function addStep() {
    const newStep: ChainStep = {
      name: `Step ${steps.length + 1}`,
      body: 'return input',
      capabilities: [],
      template: 'guest@v1'
    };
    steps = [...steps, newStep];
    syncToParent();
  }

  function removeStep(index: number) {
    steps = steps.filter((_, i) => i !== index);
    const next: Record<number, boolean> = {};
    for (const [k, v] of Object.entries(showAdvanced)) {
      const i = Number(k);
      if (i < index) next[i] = v;
      else if (i > index) next[i - 1] = v;
    }
    showAdvanced = next;
    syncToParent();
  }

  function moveStep(index: number, direction: number) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[newIndex];
    newSteps[newIndex] = temp;
    steps = newSteps;
    syncToParent();
  }

  function updateStep(index: number, updates: Partial<ChainStep>) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    steps = newSteps;
    syncToParent();
  }

  function toggleCapability(index: number, capId: string) {
    const step = steps[index];
    const caps = step.capabilities || [];
    const newCaps = caps.includes(capId) 
      ? caps.filter(c => c !== capId)
      : [...caps, capId];
    updateStep(index, { capabilities: newCaps });
  }

  function toggleAdvanced(index: number) {
    showAdvanced = { ...showAdvanced, [index]: !showAdvanced[index] };
  }
</script>

<div class="h-full flex flex-col">
  {#if parseError}
    <div class="p-3 bg-red-500/10 border border-red-500/40 rounded-(--radius) text-red-400 text-sm mb-3">
      {parseError} — fix in <strong>Raw JSON</strong> or reset steps
    </div>
  {/if}

  <div class="flex-1 space-y-3 pr-0 sm:pr-1">
    {#each steps as step, index (index)}
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
        <div class="flex items-center gap-2 px-3 py-2 border-b border-(--border)">
          <span class="text-xs text-(--text-3) font-mono w-5">{index + 1}</span>
          <input
            type="text"
            value={step.name || ''}
            oninput={(e) => updateStep(index, { name: e.currentTarget.value })}
            placeholder="Step name"
            {disabled}
            class="flex-1 bg-transparent border-none px-0 py-0 text-sm font-medium text-(--text) placeholder:text-(--text-3) focus:outline-none focus:ring-0"
          />
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              onclick={() => moveStep(index, -1)}
              disabled={disabled || index === 0}
              class="p-1 rounded text-(--text-3) hover:text-(--text) hover:bg-(--surface-alt) disabled:opacity-25"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button
              type="button"
              onclick={() => moveStep(index, 1)}
              disabled={disabled || index === steps.length - 1}
              class="p-1 rounded text-(--text-3) hover:text-(--text) hover:bg-(--surface-alt) disabled:opacity-25"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button
              type="button"
              onclick={() => removeStep(index)}
              {disabled}
              class="p-1 rounded text-(--text-3) hover:text-red-400 hover:bg-red-500/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="p-3">
          <Textarea
            value={step.body || step.code || ''}
            oninput={(e) => updateStep(index, { body: e.currentTarget.value })}
            {disabled}
            class="min-h-[80px] font-mono text-xs"
            placeholder="return input"
          />
        </div>

        <!-- Advanced: Capabilities -->
        {#if showAdvanced[index]}
          <div class="px-3 pb-3 border-t border-(--border)">
            <div class="pt-2">
              <span class="text-[0.65rem] font-semibold uppercase tracking-wider text-(--text-3)">Capabilities</span>
              <div class="flex flex-wrap gap-2 mt-1.5">
                {#each CAPABILITIES as cap}
                  <label class="inline-flex items-center gap-1 text-[0.65rem] text-(--text-2) cursor-pointer rounded px-2 py-1 bg-(--surface-alt) hover:bg-(--border)">
                    <input
                      type="checkbox"
                      checked={(step.capabilities || []).includes(cap.id)}
                      onchange={() => toggleCapability(index, cap.id)}
                      {disabled}
                      class="accent-(--accent)"
                    />
                    <code class="font-mono">{cap.label}</code>
                  </label>
                {/each}
              </div>
            </div>
          </div>
        {/if}
        <button
          type="button"
          onclick={() => toggleAdvanced(index)}
          class="w-full px-3 pb-2 text-left text-[0.65rem] text-(--text-3) hover:text-(--text)"
        >
          {#if showAdvanced[index]}
            Hide ▲
          {:else if (step.capabilities || []).length > 0}
            {step.capabilities.length} capability{step.capabilities.length > 1 ? 'ies' : 'y'} enabled ▼
          {:else}
            Advanced ▼
          {/if}
        </button>
      </div>
    {/each}

    {#if steps.length === 0}
      <div class="text-center py-8 text-(--text-3) rounded-(--radius) border border-dashed border-(--border)">
        <p class="text-sm m-0">No steps</p>
        <p class="text-xs mt-1 m-0">Add a step below</p>
      </div>
    {/if}
  </div>

  <div class="pt-3 mt-2 border-t border-(--border)">
    <Button onclick={addStep} {disabled} variant="outline" class="w-full text-sm">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      Add step
    </Button>
  </div>
</div>
