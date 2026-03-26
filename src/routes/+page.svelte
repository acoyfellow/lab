<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  import { EditorTabs, ResponsePanel } from '$lib/compose';
  import { Button } from '$lib/components/ui/button';
  import { runChain } from './data.remote.js';
  import { JSON_HEALER_STEPS } from '$lib/guest-code-fixtures';
  
  let { data }: PageProps = $props();
  
  // Local state for the playground
  let chainJson = $state(JSON.stringify(JSON_HEALER_STEPS, null, 2));
  let editorView = $state<'builder' | 'raw'>('builder');
  let loading = $state(false);
  let lastError = $state<string | null>(null);
  let lastTraceId = $state<string | null>(null);
  let lastResult = $state<unknown>(null);
  let lastSteps = $state<Array<{name: string; status: 'success' | 'error'; ms: number}>>([]);
  
  async function run() {
    loading = true;
    lastError = null;
    lastTraceId = null;
    lastResult = null;
    lastSteps = [];
    try {
      const steps = JSON.parse(chainJson);
      const r = await runChain(steps);
      
      if (r.traceId) lastTraceId = r.traceId;
      if (r.ok) {
        lastResult = r.result;
      } else {
        lastError = JSON.stringify({ error: r.error, reason: r.reason }, null, 2);
      }
      
      if (r.trace && Array.isArray(r.trace)) {
        lastSteps = r.trace.map((step, i) => ({
          name: step.name || `Step ${i + 1}`,
          status: 'success' as const,
          ms: step.ms || 0
        }));
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !loading) {
      e.preventDefault();
      run();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<SEO
  title="Lab — Open source edge compute for agents"
  description="Chain JavaScript steps at the edge. Sandboxed and provable. Every execution produces a shareable trace."
  path="/"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-12">
  <!-- Hero -->
  <section class="space-y-5" aria-labelledby="hero">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface) border border-(--border) text-[0.75rem] text-(--text-2)">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      Experimental Open source · Self-hosted on Cloudflare 
    </div>
    
    <h1 id="hero" class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15]">
      Chain JavaScript steps at the edge.<br />
      <span class="text-(--text-2)">Sandboxed and provable.</span>
    </h1>
    
    <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
      Lab is an <strong class="text-(--text)">open source</strong> tool that runs JavaScript in Cloudflare isolates with explicit capabilities. Every execution produces a <strong class="text-(--text)">shareable trace</strong>.
    </p>
  </section>

  <!-- Step 1: Install -->
  <section class="space-y-3" aria-labelledby="install">
    <h2 id="install" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Step 1 — Install
    </h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
  </section>

  <!-- Step 2: Write -->
  <section class="space-y-3" aria-labelledby="write">
    <h2 id="write" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Step 2 — Write
    </h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
    <p class="text-[0.8125rem] text-(--text-3)">
      Each step runs in a fresh isolate. Pass data between steps via <code class="font-mono text-[0.75rem]">input</code>.
    </p>
  </section>

  <!-- Step 3: See Results -->
  <section class="space-y-3" aria-labelledby="results">
    <h2 id="results" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Step 3 — See Results
    </h2>
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-3">
      <div class="flex items-center gap-2 text-[0.8125rem] text-(--text-2)">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        Run completed successfully
      </div>
      <pre class="text-[0.75rem] bg-(--code-bg) p-3 rounded font-mono overflow-x-auto">Roll call: Alice, Bob, Carol (3)

Trace: https://lab.coey.dev/t/clu01example00...</pre>
    </div>
    <p class="text-[0.8125rem] text-(--text-3)">
      Every run returns a <code class="font-mono text-[0.75rem]">traceId</code>. Share the URL, inspect inputs/outputs, fork and rerun.
    </p>
  </section>

  <!-- Step 4: Try It Live -->
  <section class="space-y-4" aria-labelledby="playground">
    <h2 id="playground" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Step 4 — Try It Live
    </h2>
    <p class="text-[0.9375rem] text-(--text-2)">
      Edit the steps below and click Run. This is a real chain executing on Cloudflare's edge.
    </p>
    
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
      <div class="p-4 border-b border-(--border)">
        <EditorTabs bind:view={editorView} bind:chainJson disabled={loading} />
      </div>
      
      <div class="p-4 border-b border-(--border) flex items-center justify-between bg-(--surface-alt)">
        <div class="text-[0.8125rem] text-(--text-2)">
          Chain mode • {JSON.parse(chainJson).length} steps
        </div>
        <Button onclick={run} disabled={loading} size="sm">
          {loading ? 'Running…' : 'Run'}
        </Button>
      </div>
      
      <div class="p-4">
        <ResponsePanel
          status={loading ? 'loading' : lastError ? 'error' : lastTraceId ? 'success' : 'idle'}
          traceId={lastTraceId}
          result={lastResult}
          steps={lastSteps}
          error={lastError}
        />
      </div>
    </div>
    
    <p class="text-[0.8125rem] text-(--text-3)">
      Press <kbd class="px-1.5 py-0.5 bg-(--surface-alt) border border-(--border) rounded text-[0.7rem]">Cmd</kbd> + <kbd class="px-1.5 py-0.5 bg-(--surface-alt) border border-(--border) rounded text-[0.7rem]">Enter</kbd> to run. 
      <a href="/examples" class="text-(--accent) hover:underline">Browse more examples →</a>
    </p>
  </section>

  <!-- More to Explore -->
  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-6 space-y-4">
    <h2 class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--text-3)">
      More to Explore
    </h2>
    <div class="grid gap-4 sm:grid-cols-3">
      <a href="/tutorial" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface-alt) hover:border-(--accent) transition-colors no-underline">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Tutorial</div>
        <div class="text-[0.9375rem] text-(--text) font-medium mb-1">Step-by-step guide</div>
        <div class="text-[0.8125rem] text-(--text-2)">Learn the fundamentals with runnable examples</div>
      </a>
      <a href="/examples" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface-alt) hover:border-(--accent) transition-colors no-underline">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Examples</div>
        <div class="text-[0.9375rem] text-(--text) font-medium mb-1">Real-world patterns</div>
        <div class="text-[0.8125rem] text-(--text-2)">API retry, webhooks, data transformation</div>
      </a>
      <a href="/docs" class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface-alt) hover:border-(--accent) transition-colors no-underline">
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2">Documentation</div>
        <div class="text-[0.9375rem] text-(--text) font-medium mb-1">API reference</div>
        <div class="text-[0.8125rem] text-(--text-2)">Complete guides and HTTP API</div>
      </a>
    </div>
  </section>

  <!-- Deployment -->
  <section class="space-y-3" aria-labelledby="deployment">
    <h2 id="deployment" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Self-Host
    </h2>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Deploy to your own Cloudflare account. You control the data, bindings (KV, AI, R2, D1), and capabilities. 
      <a href="https://github.com/acoyfellow/lab#self-host" class="text-(--accent) hover:underline">Read the self-host guide →</a>
    </p>
  </section>

</div>