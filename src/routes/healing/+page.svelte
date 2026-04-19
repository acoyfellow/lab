<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { diagnose, propose, verify, compare } from '../data.remote';
  import { page } from '$app/state';
  import type { Diagnosis, FixProposal, VerificationResult, Comparison } from '@acoyfellow/lab';

  type Step = 'idle' | 'diagnosing' | 'diagnosed' | 'proposing' | 'proposed' | 'verifying' | 'verified' | 'comparing' | 'compared';

  let traceId = $state('');
  let step = $state<Step>('idle');
  let error = $state<string | null>(null);

  let diagnosis = $state<Diagnosis | null>(null);
  let proposal = $state<FixProposal | null>(null);
  let verification = $state<VerificationResult | null>(null);
  let comparison = $state<Comparison | null>(null);

  onMount(() => {
    // 1. ?traceId= query param (deep link from trace viewer / compose)
    const urlTraceId = page.url.searchParams.get('traceId');
    if (urlTraceId) {
      traceId = urlTraceId;
      handleDiagnose();
      return;
    }
    // 2. sessionStorage (legacy handoff path)
    try {
      const stored = sessionStorage.getItem('lab-heal-trace');
      if (stored) {
        sessionStorage.removeItem('lab-heal-trace');
        traceId = stored;
        handleDiagnose();
      }
    } catch {
      // ignore
    }
  });

  async function handleDiagnose() {
    if (!traceId.trim()) return;
    step = 'diagnosing';
    error = null;
    diagnosis = null;
    proposal = null;
    verification = null;
    comparison = null;
    try {
      const r = await diagnose(traceId.trim());
      if (!r.ok || !r.diagnosis) {
        error = r.error ?? 'Diagnosis failed';
        step = 'idle';
        return;
      }
      diagnosis = r.diagnosis;
      step = 'diagnosed';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      step = 'idle';
    }
  }

  async function handlePropose() {
    if (!diagnosis) return;
    step = 'proposing';
    error = null;
    try {
      const r = await propose(diagnosis);
      if (!r.ok || !r.proposal) {
        error = r.error ?? 'Proposal failed';
        step = 'diagnosed';
        return;
      }
      proposal = r.proposal;
      step = 'proposed';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      step = 'diagnosed';
    }
  }

  async function handleVerify() {
    if (!proposal) return;
    step = 'verifying';
    error = null;
    try {
      const r = await verify({ proposal, baseTraceId: diagnosis?.context.traceId });
      if (!r.ok || !r.result) {
        error = r.error ?? 'Verification failed';
        step = 'proposed';
        return;
      }
      verification = r.result;
      step = 'verified';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      step = 'proposed';
    }
  }

  async function handleCompare() {
    if (!diagnosis || !verification) return;
    step = 'comparing';
    error = null;
    try {
      const r = await compare({ a: diagnosis.context.traceId, b: verification.traceId });
      if (!r.ok || !r.comparison) {
        error = r.error ?? 'Comparison failed';
        step = 'verified';
        return;
      }
      comparison = r.comparison;
      step = 'compared';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      step = 'verified';
    }
  }

  function reset() {
    step = 'idle';
    error = null;
    diagnosis = null;
    proposal = null;
    verification = null;
    comparison = null;
  }

  const categoryColors: Record<string, string> = {
    syntax_error: 'bg-red-100 text-red-800',
    runtime_error: 'bg-orange-100 text-orange-800',
    capability_denied: 'bg-yellow-100 text-yellow-800',
    timeout: 'bg-blue-100 text-blue-800',
    logic_error: 'bg-purple-100 text-purple-800',
    unknown: 'bg-gray-100 text-gray-800',
  };

  const confidenceColors: Record<string, string> = {
    high: 'text-green-600',
    medium: 'text-yellow-600',
    low: 'text-red-600',
  };
</script>

<SEO
  title="Self-Healing — lab"
  description="Diagnose failed traces, propose fixes, verify in sandbox, and compare results."
  path="/healing"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  <header class="space-y-1">
    <h1 class="text-lg font-semibold tracking-tight">Self-Healing</h1>
    <p class="text-[0.8125rem] text-(--text-2)">
      Diagnose a failed trace, let AI propose a fix, verify it in a sandbox, and compare the results.
    </p>
  </header>

  <!-- Step 1: Input trace ID -->
  <div class="space-y-3">
    <label for="trace-id" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block">
      Failed trace ID
    </label>
    <div class="flex gap-2">
      <input
        id="trace-id"
        type="text"
        bind:value={traceId}
        placeholder="e.g. a1b2c3d4e5"
        disabled={step !== 'idle'}
        class="flex-1 border border-(--border) rounded-(--radius) bg-white px-3 py-2 text-[0.8125rem] font-mono"
      />
      <Button onclick={handleDiagnose} disabled={step !== 'idle' || !traceId.trim()}>
        Diagnose
      </Button>
    </div>
  </div>

  {#if error}
    <div class="rounded-(--radius) border border-red-200 bg-red-50 px-4 py-3 text-[0.8125rem] text-red-800">
      {error}
    </div>
  {/if}

  <!-- Step 2: Diagnosis -->
  {#if diagnosis}
    <div class="rounded-(--radius) border border-(--border) bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-[0.8125rem] font-semibold">Diagnosis</h2>
        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium {categoryColors[diagnosis.problem.category] ?? categoryColors.unknown}">
          {diagnosis.problem.category.replace(/_/g, ' ')}
        </span>
      </div>

      <p class="text-[0.8125rem] text-(--text-2)">{diagnosis.problem.description}</p>

      {#if diagnosis.problem.stepIndex !== null}
        <p class="text-[0.75rem] text-(--text-3)">Failed at step {diagnosis.problem.stepIndex}</p>
      {/if}

      <div class="space-y-1">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Context</span>
        <dl class="text-[0.75rem] text-(--text-2) space-y-0.5">
          <dt class="inline font-medium">Error:</dt>
          <dd class="inline">{diagnosis.context.errorMessage}</dd>
        </dl>
        {#if diagnosis.context.capabilities?.length}
          <p class="text-[0.75rem] text-(--text-3)">Capabilities: {diagnosis.context.capabilities.join(', ')}</p>
        {/if}
      </div>

      {#if diagnosis.hints.length > 0}
        <div class="space-y-1">
          <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Hints</span>
          <ul class="list-disc list-inside text-[0.75rem] text-(--text-2) space-y-0.5">
            {#each diagnosis.hints as hint}
              <li>{hint}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <p class="text-[0.75rem]">
        Confidence: <span class={confidenceColors[diagnosis.confidence]}>{diagnosis.confidence}</span>
      </p>

      {#if step === 'diagnosed'}
        <Button onclick={handlePropose} class="mt-2">Propose Fix</Button>
      {/if}
    </div>
  {/if}

  <!-- Step 3: Proposal -->
  {#if proposal}
    <div class="rounded-(--radius) border border-(--border) bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-[0.8125rem] font-semibold">Proposed Fix</h2>
        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium bg-blue-100 text-blue-800">
          {proposal.type.replace(/_/g, ' ')}
        </span>
      </div>

      <p class="text-[0.8125rem] text-(--text-2)">{proposal.description}</p>

      {#if proposal.changes.body}
        <div class="space-y-1">
          <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Suggested Code</span>
          <pre class="rounded-(--radius) bg-(--surface-alt) p-3 text-[0.75rem] font-mono overflow-x-auto whitespace-pre-wrap">{proposal.changes.body}</pre>
        </div>
      {/if}

      {#if proposal.changes.capabilities}
        <p class="text-[0.75rem] text-(--text-2)">Capabilities: {proposal.changes.capabilities.join(', ')}</p>
      {/if}

      {#if proposal.changes.template}
        <p class="text-[0.75rem] text-(--text-2)">Template: {proposal.changes.template}</p>
      {/if}

      <div class="space-y-1">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Reasoning</span>
        <p class="text-[0.75rem] text-(--text-2)">{proposal.reasoning}</p>
      </div>

      <p class="text-[0.75rem]">
        Estimated confidence: <span class={confidenceColors[proposal.estimatedConfidence]}>{proposal.estimatedConfidence}</span>
      </p>

      {#if step === 'proposed'}
        <Button onclick={handleVerify} class="mt-2">Verify Fix</Button>
      {/if}
    </div>
  {/if}

  <!-- Step 4: Verification -->
  {#if verification}
    <div class="rounded-(--radius) border border-(--border) bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-[0.8125rem] font-semibold">Verification</h2>
        <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium {verification.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          {verification.ok ? 'passed' : 'failed'}
        </span>
      </div>

      <p class="text-[0.75rem] text-(--text-3)">New trace: <code class="font-mono">{verification.traceId}</code></p>

      {#if verification.result !== undefined}
        <div class="space-y-1">
          <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">Result</span>
          <pre class="rounded-(--radius) bg-(--surface-alt) p-3 text-[0.75rem] font-mono overflow-x-auto whitespace-pre-wrap">{JSON.stringify(verification.result, null, 2)}</pre>
        </div>
      {/if}

      {#if verification.error}
        <p class="text-[0.8125rem] text-red-600">{verification.error}</p>
      {/if}

      {#if step === 'verified'}
        <Button onclick={handleCompare} class="mt-2">Compare with Original</Button>
      {/if}
    </div>
  {/if}

  <!-- Step 5: Comparison -->
  {#if comparison}
    <div class="rounded-(--radius) border border-(--border) bg-white p-4 space-y-3">
      <h2 class="text-[0.8125rem] font-semibold">Comparison</h2>

      <p class="text-[0.8125rem] text-(--text-2)">{comparison.summary}</p>

      <div class="space-y-2 text-[0.75rem]">
        <div class="flex items-center gap-2">
          <span class="w-20 text-(--text-3)">Input</span>
          <span class={comparison.diff.input.changed ? 'text-yellow-600 font-medium' : 'text-(--text-3)'}>
            {comparison.diff.input.changed ? 'changed' : 'unchanged'}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-20 text-(--text-3)">Code</span>
          <span class={comparison.diff.code.changed ? 'text-yellow-600 font-medium' : 'text-(--text-3)'}>
            {comparison.diff.code.changed ? 'changed' : 'unchanged'}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-20 text-(--text-3)">Output</span>
          <span class={comparison.diff.output.changed ? 'text-yellow-600 font-medium' : 'text-(--text-3)'}>
            {comparison.diff.output.changed ? 'changed' : 'unchanged'}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-20 text-(--text-3)">Error</span>
          {#if comparison.diff.error.resolved}
            <span class="text-green-600 font-medium">resolved</span>
          {:else if comparison.diff.error.introduced}
            <span class="text-red-600 font-medium">new error introduced</span>
          {:else}
            <span class="text-(--text-3)">unchanged</span>
          {/if}
        </div>
      </div>

      <Button onclick={reset} variant="outline" class="mt-2">Start Over</Button>
    </div>
  {/if}

  {#if step !== 'idle' && !comparison}
    <div class="flex items-center gap-2 pt-2">
      <div class="flex items-center gap-1 text-[0.6875rem] text-(--text-3)">
        {#each ['diagnose', 'propose', 'verify', 'compare'] as s, i}
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[0.625rem] font-bold
            {step.includes(s.slice(0, -1)) || (i < ['idle','diagnos','propos','verify','compar'].indexOf(step.replace(/ing|ed$/,''))) ? 'bg-(--accent) text-white' : 'bg-(--surface-alt) text-(--text-3)'}">
            {i + 1}
          </span>
        {/each}
      </div>
      <span class="text-[0.75rem] text-(--text-3)">
        {#if step === 'diagnosing'}Analyzing trace...{/if}
        {#if step === 'proposing'}Generating fix proposal...{/if}
        {#if step === 'verifying'}Running fix in sandbox...{/if}
        {#if step === 'comparing'}Comparing traces...{/if}
      </span>
    </div>
  {/if}
</div>
