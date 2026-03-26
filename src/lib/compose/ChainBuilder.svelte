<script lang="ts">
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import type { ChainStep } from '@acoyfellow/lab';
  import { GUEST_TEMPLATE_IDS } from '$lib/guest-templates';

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

  /** Step index -> code editor expanded */
  let codeOpen = $state<Record<number, boolean>>({});

  function syncToParent() {
    parseError = null;
    chainJson = JSON.stringify(steps, null, 2);
  }

  function previewBody(step: ChainStep): string {
    const b = step.body ?? step.code ?? '';
    const line = b.split('\n')[0]?.trim() ?? '';
    return line.length > 72 ? `${line.slice(0, 72)}…` : line || '(empty)';
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
    for (const [k, v] of Object.entries(codeOpen)) {
      const i = Number(k);
      if (i < index) next[i] = v;
      else if (i > index) next[i - 1] = v;
    }
    codeOpen = next;
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
    const a = codeOpen[index];
    const b = codeOpen[newIndex];
    codeOpen = { ...codeOpen, [index]: b ?? false, [newIndex]: a ?? false };
    syncToParent();
  }

  function updateStepName(index: number, name: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], name };
    steps = newSteps;
    syncToParent();
  }

  function updateStepBody(index: number, body: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], body };
    steps = newSteps;
    syncToParent();
  }

  function updateStepTemplate(index: number, template: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], template };
    steps = newSteps;
    syncToParent();
  }

  function toggleCapability(index: number, capId: string) {
    const newSteps = [...steps];
    const step = newSteps[index];
    const caps = step.capabilities || [];
    if (caps.includes(capId)) {
      step.capabilities = caps.filter(c => c !== capId);
    } else {
      step.capabilities = [...caps, capId];
    }
    steps = newSteps;
    syncToParent();
  }

  function toggleCodeOpen(index: number) {
    codeOpen = { ...codeOpen, [index]: !codeOpen[index] };
  }
</script>

<div class="h-full flex flex-col">
  {#if parseError}
    <div class="p-3 bg-red-500/10 border border-red-500/40 rounded-(--radius) text-red-400 text-sm mb-3">
      {parseError} — fix in <strong>Raw JSON</strong> or reset steps
    </div>
  {/if}

  <div class="flex-1 space-y-2 pr-0 sm:pr-1">
    {#each steps as step, index (index)}
      <div
        class="rounded-(--radius) border border-(--border) bg-(--surface) border-l-[3px] border-l-(--accent)/60 overflow-hidden"
      >
        <div class="flex items-start gap-2 px-3 py-2 border-b border-(--border)/80 bg-(--surface-alt)/40">
          <span class="text-[0.65rem] text-(--text-3) font-mono tabular-nums pt-1.5 shrink-0">{index + 1}</span>
          <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={step.name || ''}
              oninput={(e) => updateStepName(index, e.currentTarget.value)}
              placeholder="Step name"
              {disabled}
              class="w-full sm:max-w-56 bg-transparent border border-transparent rounded px-1 py-0.5 text-sm font-medium text-(--text) placeholder:text-(--text-3) focus:outline-none focus:border-(--border)"
            />
            <select
              value={step.template || 'guest@v1'}
              onchange={(e) => updateStepTemplate(index, e.currentTarget.value)}
              {disabled}
              class="w-full sm:w-auto max-w-full border border-(--border) rounded bg-(--surface) px-2 py-1 text-[0.7rem] text-(--text) font-mono"
            >
              {#each GUEST_TEMPLATE_IDS as tid}
                <option value={tid}>{tid}</option>
              {/each}
            </select>
          </div>
          <div class="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onclick={() => moveStep(index, -1)}
              disabled={disabled || index === 0}
              class="p-1.5 rounded text-(--text-3) hover:text-(--text) hover:bg-(--surface-alt) disabled:opacity-25 disabled:pointer-events-none"
              title="Move up"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button
              type="button"
              onclick={() => moveStep(index, 1)}
              disabled={disabled || index === steps.length - 1}
              class="p-1.5 rounded text-(--text-3) hover:text-(--text) hover:bg-(--surface-alt) disabled:opacity-25 disabled:pointer-events-none"
              title="Move down"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button
              type="button"
              onclick={() => removeStep(index)}
              {disabled}
              class="p-1.5 rounded text-(--text-3) hover:text-red-400 hover:bg-red-500/10 disabled:opacity-25"
              title="Remove"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <div class="px-3 py-2 space-y-2">
          {#if codeOpen[index]}
            <div>
              <label class="text-[0.65rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1" for="step-body-{index}">Code</label>
              <Textarea
                id="step-body-{index}"
                value={step.body || step.code || ''}
                oninput={(e) => updateStepBody(index, e.currentTarget.value)}
                {disabled}
                class="min-h-[100px] font-mono text-xs"
              />
            </div>
          {:else}
            <button
              type="button"
              onclick={() => toggleCodeOpen(index)}
              class="w-full text-left rounded border border-dashed border-(--border) bg-(--surface-alt)/50 px-2 py-2 text-xs font-mono text-(--text-2) hover:border-(--accent)/40 hover:bg-(--surface-alt)"
            >
              <span class="text-(--text-3) text-[0.65rem] uppercase tracking-wide">Code</span>
              <span class="block truncate text-(--text) mt-0.5">{previewBody(step)}</span>
              <span class="text-[0.65rem] text-(--accent) mt-1 inline-block">Expand</span>
            </button>
          {/if}

          {#if codeOpen[index]}
            <button
              type="button"
              onclick={() => toggleCodeOpen(index)}
              class="text-[0.65rem] text-(--text-3) hover:text-(--text)"
            >
              Collapse
            </button>
          {/if}

          <fieldset class="border-0 p-0 m-0">
            <legend class="text-[0.65rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1.5">Capabilities</legend>
            <div class="flex flex-wrap gap-x-2 gap-y-1">
              {#each CAPABILITIES as cap}
                <label
                  class="inline-flex items-center gap-1 text-[0.65rem] text-(--text-2) cursor-pointer rounded px-1.5 py-0.5 hover:bg-(--surface-alt)"
                >
                  <input
                    type="checkbox"
                    checked={(step.capabilities || []).includes(cap.id)}
                    onchange={() => toggleCapability(index, cap.id)}
                    {disabled}
                    class="accent-(--accent) scale-90"
                  />
                  <code class="font-mono">{cap.label}</code>
                </label>
              {/each}
            </div>
          </fieldset>
        </div>
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
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      Add step
    </Button>
  </div>
</div>
