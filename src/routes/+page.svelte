<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  import MiniSandbox from '$lib/tutorial/MiniSandbox.svelte';
  
  let { data }: PageProps = $props();
</script>

<SEO
  title="Lab — Open source edge compute for agents"
  description="Chain JavaScript steps at the edge. Sandboxed and provable. Every execution produces a shareable trace."
  path="/"
  type="website"
/>

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-10">
  
  <header class="space-y-4">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface) border border-(--border) text-[0.75rem] text-(--text-2)">
      <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
      Open source · Self-hosted on Cloudflare
    </div>
    
    <h1 class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15]">
      Chain JavaScript steps at the edge.<br />
      <span class="text-(--text-2)">Sandboxed and provable.</span>
    </h1>
    
    <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
      Run JavaScript in Cloudflare isolates with explicit capabilities. 
      Every execution produces a <strong class="text-(--text)">shareable trace</strong>.
    </p>
  </header>

  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">1. Install</h2>
      <a href="/docs/install" class="text-[0.8125rem] text-(--accent) hover:underline">Full guide →</a>
    </div>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
  </section>

  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">2. Try It</h2>
      <a href="/tutorial" class="text-[0.8125rem] text-(--accent) hover:underline">Tutorial →</a>
    </div>
    <p class="text-[0.9375rem] text-(--text-2)">
      Run a 3-step chain on Cloudflare's edge. Edit the code, click Run, see the data flow.
    </p>
    <MiniSandbox />
  </section>

  <section class="space-y-4">
    <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">3. Learn More</h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <a href="/tutorial" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="w-10 h-10 rounded-full bg-(--accent)/10 text-(--accent) flex items-center justify-center font-semibold">1</div>
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Tutorial</div>
          <div class="text-[0.8125rem] text-(--text-2)">Step-by-step guide</div>
        </div>
      </a>
      
      <a href="/examples" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="w-10 h-10 rounded-full bg-(--accent)/10 text-(--accent) flex items-center justify-center font-semibold">2</div>
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Examples</div>
          <div class="text-[0.8125rem] text-(--text-2)">Real-world patterns</div>
        </div>
      </a>
      
      <a href="/docs" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="w-10 h-10 rounded-full bg-(--accent)/10 text-(--accent) flex items-center justify-center font-semibold">3</div>
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Documentation</div>
          <div class="text-[0.8125rem] text-(--text-2)">API reference</div>
        </div>
      </a>
      
      <a href="/docs/self-host" class="flex items-center gap-3 p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group">
        <div class="w-10 h-10 rounded-full bg-(--accent)/10 text-(--accent) flex items-center justify-center font-semibold">4</div>
        <div>
          <div class="font-semibold text-(--text) group-hover:text-(--accent)">Self-Host</div>
          <div class="text-[0.8125rem] text-(--text-2)">Deploy to Cloudflare</div>
        </div>
      </a>
    </div>
  </section>

</div>