<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import AutoResizeTextarea from '$lib/AutoResizeTextarea.svelte';
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

  let steps = $state<ChainStep[]>([]);
  let parseError = $state<string | null>(null);

  $effect(() => {
    try {
      const parsed = JSON.parse(chainJson || '[]') as ChainStep[];
      if (Array.isArray(parsed)) {
        steps = parsed;
        parseError = null;
      } else {
        parseError = 'Chain JSON must be an array';
      }
    } catch {
      parseError = 'Invalid JSON';
    }
  });

  $effect(() => {
    if (!parseError) {
      chainJson = JSON.stringify(steps, null, 2);
    }
  });

  function addStep() {
    const newStep: ChainStep = {
      name: `Step ${steps.length + 1}`,
      body: 'return input',
      capabilities: [],
      template: 'guest@v1'
    };
    steps = [...steps, newStep];
  }

  function removeStep(index: number) {
    steps = steps.filter((_, i) => i !== index);
  }

  function moveStep(index: number, direction: number) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[newIndex];
    newSteps[newIndex] = temp;
    steps = newSteps;
  }

  function updateStepName(index: number, name: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], name };
    steps = newSteps;
  }

  function updateStepBody(index: number, body: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], body };
    steps = newSteps;
  }

  function updateStepTemplate(index: number, template: string) {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], template };
    steps = newSteps;
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
  }
</script>

<div class="h-full flex flex-col">
  {#if parseError}
    <div class="p-4 bg-red-500/10 border border-red-500/50 rounded-(--radius) text-red-500 text-sm mb-4">
      {parseError} - Switch to "Raw JSON" tab to fix
    </div>
  {/if}

  <div class="flex-1 space-y-3 pr-2">
    {#each steps as step, index (index)}
      <Card class="border-(--border)">
        <CardHeader class="pb-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-1">
              <span class="text-xs text-(--text-3) font-mono">Step {index + 1}</span>
              <input
                type="text"
                value={step.name || ''}
                oninput={(e) => updateStepName(index, e.currentTarget.value)}
                placeholder="Step name"
                {disabled}
                class="flex-1 bg-transparent border-none p-0 text-sm font-medium text-(--text) placeholder:text-(--text-3) focus:outline-none focus:ring-0"
              />
            </div>
            <div class="flex items-center gap-1">
              <button
                onclick={() => moveStep(index, -1)}
                disabled={disabled || index === 0}
                class="p-1 text-(--text-3) hover:text-(--text) disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button
                onclick={() => moveStep(index, 1)}
                disabled={disabled || index === steps.length - 1}
                class="p-1 text-(--text-3) hover:text-(--text) disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button
                onclick={() => removeStep(index)}
                {disabled}
                class="p-1 text-(--text-3) hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Remove step"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-3 pt-0">
          <div>
            <label class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5" 
            for="step-template-{index}">
              Template
            </label>
            <select
              id="step-template-{index}"
              value={step.template || 'guest@v1'}
              onchange={(e) => updateStepTemplate(index, e.currentTarget.value)}
              {disabled}
              class="w-full border border-(--border) rounded-(--radius) bg-(--surface) px-3 py-1.5 text-xs text-(--text) font-mono"
            >
              {#each GUEST_TEMPLATE_IDS as tid}
                <option value={tid}>{tid}</option>
              {/each}
            </select>
          </div>

          <div>
            <label 
              for="step-body-{index}" 
              class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1.5">
              Code
            </label>
            <textarea
              id="step-body-{index}"
              value={step.body || step.code || ''}
              oninput={(e) => updateStepBody(index, e.currentTarget.value)}
              {disabled}
              rows={4}
              class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-mono text-xs text-(--text) resize-y min-h-[80px]"
            ></textarea>
          </div>

          <fieldset class="border border-(--border) rounded-(--radius) p-2.5">
            <legend class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) px-1">Capabilities</legend>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {#each CAPABILITIES as cap}
                <label class="flex items-center gap-1.5 text-xs text-(--text-2) cursor-pointe p-1.5 hover:bg-(--surface-alt)">
                  <input
                    type="checkbox"
                    checked={(step.capabilities || []).includes(cap.id)}
                    onchange={() => toggleCapability(index, cap.id)}
                    {disabled}
                    class="accent-(--accent)"
                  />
                  <code class="font-mono text-xs">{cap.label}</code>
                </label>
              {/each}
            </div>
          </fieldset>
        </CardContent>
      </Card>
    {/each}

    {#if steps.length === 0}
      <div class="text-center py-8 text-(--text-3)">
        <p class="text-sm">No steps yet</p>
        <p class="text-xs mt-1">Add a step to get started</p>
      </div>
    {/if}
  </div>

  <div class="pt-3 mt-3 border-t border-(--border)">
    <Button onclick={addStep} {disabled} variant="outline" class="w-full">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
      Add Step
    </Button>
  </div>
</div>