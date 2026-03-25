<script lang="ts">
  import type { ExampleData } from './types';
  
  type Props = {
    data: ExampleData;
    variant: 'mini' | 'card' | 'full' | 'hero';
    onRun?: () => void;
  };
  
  let { data, variant, onRun }: Props = $props();
  
  function getIcon(iconName: string): string {
    const icons: Record<string, string> = {
      wand: '✨',
      shield: '🛡️',
      lock: '🔒',
      scale: '⚖️'
    };
    return icons[iconName] || '🔧';
  }
</script>

{#if variant === 'mini'}
  <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 hover:border-(--accent)/30 transition-colors">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-xl">{getIcon(data.icon || '')}</span>
      <h3 class="font-semibold text-(--text)">{data.title}</h3>
    </div>
    <p class="text-[0.8125rem] text-(--text-2) mb-3">{data.description}</p>
    <button 
      onclick={onRun}
      class="text-[0.75rem] text-(--accent) hover:underline font-medium"
    >
      Try it →
    </button>
  </div>
{:else if variant === 'card'}
  <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 hover:border-(--accent)/30 transition-colors">
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-2xl">{getIcon(data.icon || '')}</span>
        <h3 class="font-semibold text-lg text-(--text)">{data.title}</h3>
      </div>
      <div class="flex gap-1">
        {#each data.tags.slice(0, 2) as tag}
          <span class="px-2 py-0.5 rounded-full text-[0.625rem] bg-(--surface-alt) text-(--text-3) border border-(--border)">
            {tag}
          </span>
        {/each}
      </div>
    </div>
    
    <p class="text-[0.9375rem] text-(--text-2) mb-4">{data.description}</p>
    
    <div class="space-y-2 mb-4">
      {#each data.steps.slice(0, 2) as step}
        <div class="flex items-center gap-2 text-[0.8125rem] text-(--text-3)">
          <span class="w-1.5 h-1.5 rounded-full bg-(--accent)"></span>
          {step.name}
        </div>
      {/each}
      {#if data.steps.length > 2}
        <div class="text-[0.75rem] text-(--text-3) pl-3.5">+{data.steps.length - 2} more steps</div>
      {/if}
    </div>
    
    <button 
      onclick={onRun}
      class="w-full py-2 rounded-(--radius) bg-(--accent) text-white text-[0.8125rem] font-medium hover:bg-(--accent-hover) transition-colors"
    >
      Run Example
    </button>
  </div>
{:else if variant === 'full'}
  <div class="space-y-6">
    <div class="flex items-start gap-4">
      <span class="text-4xl">{getIcon(data.icon || '')}</span>
      <div>
        <h2 class="text-2xl font-semibold text-(--text) mb-2">{data.title}</h2>
        <p class="text-[1.0625rem] text-(--text-2)">{data.description}</p>
      </div>
    </div>
    
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Problem</div>
        <p class="text-[0.9375rem] text-(--text-2)">{data.problem}</p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Solution</div>
        <p class="text-[0.9375rem] text-(--text-2)">{data.solution}</p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Result</div>
        <p class="text-[0.9375rem] text-(--text-2)">{data.result}</p>
      </div>
    </div>
    
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4">
      <h3 class="font-semibold text-(--text) mb-4">Execution Steps</h3>
      <div class="space-y-3">
        {#each data.steps as step, i}
          <div class="flex gap-3 p-3 rounded-(--radius) bg-(--surface-alt)">
            <div class="flex-shrink-0 w-6 h-6 rounded-full bg-(--accent) text-white flex items-center justify-center text-[0.75rem] font-semibold">
              {i + 1}
            </div>
            <div class="flex-1">
              <div class="font-medium text-(--text) mb-1">{step.name}</div>
              {#if step.description}
                <div class="text-[0.8125rem] text-(--text-3) mb-2">{step.description}</div>
              {/if}
              {#if step.code}
                <pre class="text-[0.75rem] bg-(--surface) p-2 rounded font-mono overflow-x-auto">{step.code}</pre>
              {/if}
              {#if step.error}
                <div class="mt-2 text-[0.75rem] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/30">
                  {step.error}
                </div>
              {/if}
            </div>
            {#if step.ms}
              <div class="text-[0.75rem] text-(--text-3) font-mono">{step.ms}ms</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    
    {#if onRun}
      <button 
        onclick={onRun}
        class="w-full py-3 rounded-(--radius) bg-(--accent) text-white font-semibold hover:bg-(--accent-hover) transition-colors"
      >
        Try It Yourself
      </button>
    {/if}
  </div>
{:else if variant === 'hero'}
  <div class="space-y-8">
    <div class="flex items-center gap-3">
      <span class="text-5xl">{getIcon(data.icon || '')}</span>
      <div>
        <div class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--accent) mb-1">Featured Example</div>
        <h2 class="text-3xl font-semibold text-(--text)">{data.title}</h2>
      </div>
    </div>
    
    <p class="text-[1.125rem] text-(--text-2) max-w-2xl">{data.description}</p>
    
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-4">
        <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-5">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-3">The Problem</div>
          <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">{data.problem}</p>
        </div>
        <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-5">
          <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-3">Lab Solution</div>
          <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">{data.solution}</p>
        </div>
      </div>
      
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-5">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-4">Execution Trace</div>
        <div class="space-y-2">
          {#each data.steps as step, i}
            <div class="flex items-center gap-3 p-3 rounded-(--radius) bg-(--surface-alt) {step.error ? 'border border-red-500/30' : ''}">
              <div class="flex-shrink-0 w-7 h-7 rounded-full {step.error ? 'bg-red-500' : 'bg-(--accent)'} text-white flex items-center justify-center text-[0.75rem] font-semibold">
                {step.error ? '✕' : i + 1}
              </div>
              <div class="flex-1">
                <div class="font-medium text-(--text)">{step.name}</div>
                {#if step.error}
                  <div class="text-[0.75rem] text-red-400 mt-1">{step.error}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
    
    <div class="flex flex-wrap gap-3">
      {#each data.tags as tag}
        <span class="px-3 py-1 rounded-full text-[0.75rem] bg-(--surface-alt) text-(--text-2) border border-(--border)">
          {tag}
        </span>
      {/each}
    </div>
    
    {#if onRun}
      <button 
        onclick={onRun}
        class="inline-flex items-center gap-2 px-6 py-3 rounded-(--radius) bg-(--accent) text-white font-semibold hover:bg-(--accent-hover) transition-colors"
      >
        Run This Example
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    {/if}
  </div>
{/if}
