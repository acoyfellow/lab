<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  
  let { data }: PageProps = $props();
</script>

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

  <!-- Step 4: Example -->
  <section class="space-y-4" aria-labelledby="example">
    <h2 id="example" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Example — JSON Healer
    </h2>
    <p class="text-[0.9375rem] text-(--text-2)">
      A 4-step chain that parses broken JSON, attempts repair, and validates the result.
    </p>
    
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) overflow-hidden">
      <div class="p-4 border-b border-(--border)">
        <div class="flex items-center gap-2 mb-4">
          <div class="flex gap-1">
            <button class="px-3 py-1.5 text-[0.8125rem] font-medium rounded-(--radius) bg-(--accent) text-white">Builder</button>
            <button class="px-3 py-1.5 text-[0.8125rem] font-medium rounded-(--radius) text-(--text-2) hover:bg-(--surface-alt)">Raw JSON</button>
          </div>
        </div>
        
        <div class="space-y-3">
          <div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs text-(--text-3) font-mono">Step 1</span>
              <span class="text-sm font-medium">Load Broken JSON</span>
            </div>
            <p class="text-[0.8125rem] text-(--text-2)">Receive malformed JSON with trailing commas</p>
          </div>
          
          <div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs text-(--text-3) font-mono">Step 2</span>
              <span class="text-sm font-medium">Parse Attempt</span>
            </div>
            <p class="text-[0.8125rem] text-(--text-2)">Try parsing — fails with SyntaxError</p>
          </div>
          
          <div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs text-(--text-3) font-mono">Step 3</span>
              <span class="text-sm font-medium">Auto-Heal</span>
            </div>
            <p class="text-[0.8125rem] text-(--text-2)">Remove trailing commas, retry parsing</p>
          </div>
          
          <div class="rounded-(--radius) border border-(--border) bg-(--surface-alt) p-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs text-(--text-3) font-mono">Step 4</span>
              <span class="text-sm font-medium">Validate</span>
            </div>
            <p class="text-[0.8125rem] text-(--text-2)">Return healed data with fix diagnosis</p>
          </div>
        </div>
      </div>
      
      <div class="p-4 bg-(--surface-alt)">
        <a 
          href="/compose?example=json-healer"
          class="inline-flex items-center justify-center w-full py-2.5 rounded-(--radius) bg-(--accent) text-white font-medium hover:bg-(--accent-hover) transition-colors no-underline"
        >
          Try It in Compose
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>
    </div>
    
    <p class="text-[0.8125rem] text-(--text-3)">
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