<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Lab — Open source edge compute for agents"
  description="Open source tool to run JavaScript in Cloudflare isolates with least-privilege capabilities. Self-host on your Cloudflare account. Every execution produces a shareable trace."
  path="/"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-12">
  <!-- Hero -->
  <section class="space-y-5" aria-labelledby="hero">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface) border border-(--border) text-[0.75rem] text-(--text-2)">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      Open source · Self-hosted on Cloudflare
    </div>
    
    <h1 id="hero" class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15]">
      Chain JavaScript steps at the edge.<br />
      <span class="text-(--text-2)">Sandboxed and provable.</span>
    </h1>
    
    <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
      Lab is an <strong class="text-(--text)">open source</strong> tool that runs JavaScript in Cloudflare isolates with explicit capabilities. Every execution produces a <strong class="text-(--text)">shareable trace</strong> — perfect for agents and orchestrators that need to prove what code ran.
    </p>
    
    <div class="flex flex-wrap gap-3 pt-1">
      <a
        href="/compose"
        class="inline-flex items-center min-h-10 font-semibold text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--accent) text-white border border-(--accent) no-underline hover:bg-(--accent-hover) transition-colors"
      >Try the demo</a>
      <a
        href="/docs"
        class="inline-flex items-center min-h-10 font-medium text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt) transition-colors"
      >Docs</a>
    </div>
    
    <p class="text-[0.8125rem] text-(--text-3) max-w-[55ch]">
      This site (lab.coey.dev) is a demo. Deploy to your own Cloudflare account for production use.
    </p>
  </section>

  <!-- How It Works -->
  <section class="grid gap-4 sm:grid-cols-3" aria-labelledby="how">
    <h2 id="how" class="sr-only">How it works</h2>
    
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-(--accent) text-white flex items-center justify-center text-[0.75rem] font-semibold">1</span>
        <span class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--text-3)">Isolates</span>
      </div>
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
        Each run executes in a fresh V8 isolate on Cloudflare's edge. Milliseconds to first instruction.
      </p>
    </div>
    
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-(--accent) text-white flex items-center justify-center text-[0.75rem] font-semibold">2</span>
        <span class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--text-3)">Capabilities</span>
      </div>
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
        Explicit permissions. Code only gets <code class="text-[0.75rem] font-mono">kvRead</code>, <code class="text-[0.75rem] font-mono">workersAi</code>, <code class="text-[0.75rem] font-mono">spawn</code> if you declare it.
      </p>
    </div>
    
    <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-full bg-(--accent) text-white flex items-center justify-center text-[0.75rem] font-semibold">3</span>
        <span class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--text-3)">Traces</span>
      </div>
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
        Every run produces a durable trace. Share <code class="text-[0.75rem] font-mono">/t/:id</code> links. Inspect, fork, rerun.
      </p>
    </div>
  </section>

  <!-- Code Example -->
  <section id="from-code" class="space-y-3" aria-labelledby="code-heading">
    <h2 id="code-heading" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      From TypeScript
    </h2>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
    <p class="text-[0.8125rem] text-(--text-3)">
      <code class="font-mono text-[0.75rem]">npm install @acoyfellow/lab</code>. Every run returns a <code class="font-mono text-[0.75rem]">traceId</code>.
    </p>
  </section>

  <!-- Deployment Model -->
  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-4" aria-labelledby="deployment">
    <h2 id="deployment" class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Deployment
    </h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <h3 class="font-semibold text-(--text)">Self-host (recommended)</h3>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Deploy to your Cloudflare account. You control the bindings (KV, AI, R2, D1), capabilities, and data. No external dependencies.
        </p>
        <a
          href="https://github.com/acoyfellow/lab#self-host"
          class="inline-flex items-center text-[0.8125rem] text-(--accent) hover:underline"
        >Self-host guide →</a>
      </div>
      <div class="space-y-2">
        <h3 class="font-semibold text-(--text)">MCP for Agents</h3>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Connect Lab to Cursor, Claude Desktop, or any MCP host. Two tools: <code class="font-mono text-[0.75rem]">find</code> and <code class="font-mono text-[0.75rem]">execute</code>.
        </p>
        <AppLink to={paths.docsAgentIntegration} class="inline-flex items-center text-[0.8125rem] text-(--accent) hover:underline">
          Agent integration →
        </AppLink>
      </div>
    </div>
  </section>

  <!-- Run Modes -->
  <section class="space-y-3" aria-labelledby="modes">
    <h2 id="modes" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Run Modes
    </h2>
    <div class="flex flex-wrap gap-2">
      {#each [
        { name: 'Sandbox', desc: 'Single isolate' },
        { name: 'KV Read', desc: 'With KV snapshot' },
        { name: 'Chain', desc: 'Multi-step pipeline' },
        { name: 'Spawn', desc: 'Parallel isolates' },
        { name: 'Generate', desc: 'AI-generated code' }
      ] as mode}
        <div class="rounded-(--radius) border border-(--border) bg-(--surface) px-3 py-2">
          <span class="text-[0.8125rem] font-semibold text-(--accent)">{mode.name}</span>
          <span class="text-[0.75rem] text-(--text-3) ml-2">{mode.desc}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- Examples -->
  <section class="space-y-4" aria-labelledby="examples">
    <div class="flex items-center justify-between">
      <h2 id="examples" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
        Example
      </h2>
      <a href="/compose" class="text-[0.8125rem] text-(--accent) hover:underline">Try it →</a>
    </div>
    <a 
      href="/compose?example=json-healer" 
      class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 hover:border-(--accent)/30 transition-colors group"
    >
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xl">✨</span>
        <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">JSON Healer</h3>
      </div>
      <p class="text-[0.8125rem] text-(--text-2)">Fix broken JSON automatically with full audit trail.</p>
    </a>
  </section>

</div>
