<script lang="ts">
  import type { PageProps } from './$types';
  import SEO from '$lib/SEO.svelte';
  import MiniSandbox from '$lib/tutorial/MiniSandbox.svelte';
  import { Button } from '$lib/components/ui/button';

  let { data }: PageProps = $props();
</script>

<SEO
  title="Lab — Chainable edge execution"
  description="Chain JavaScript in Cloudflare isolates with explicit capabilities per step. Traces record what ran for sharing and inspection."
  path="/"
  type="website"
/>

<div class="">
  <!-- Full-width hero band (option 2): bg image + gradient scrim, copy overlaid left -->
  <section
    class="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden "
  >
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-[url('/bg.jpg')] bg-cover bg-position-[62%_center] sm:bg-center"
    ></div>
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-linear-to-r from-(--bg) from-0% via-(--bg)/95 via-48% to-(--bg)/15 to-100%"
    ></div>
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-(--bg)/80 pointer-events-none"
    ></div>

    <header
      class="relative z-10 max-w-3xl mx-auto px-6 py-12 max-sm:px-4 sm:py-14 md:py-16 min-h-[min(42vh,400px)] flex flex-col justify-center"
    >
      <div class="space-y-4 max-w-160">
        <div
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface)/90 backdrop-blur-sm border border-(--border) text-[0.75rem] text-(--text-2) shadow-sm"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          Experimental toolkit for Cloudflare Workers
        </div>

        <h1 class="text-[1.65rem] sm:text-[2.25rem] font-semibold tracking-tight leading-[1.15] text-(--text) drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">
          Chainable edge execution.<br />
          <span class="text-(--text-2)">Isolates, capabilities, composable steps.</span>
        </h1>

        <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[60ch]">
          Run untrusted JavaScript on Cloudflare workers with <strong class="text-(--text)">least-privilege caps per step</strong>.
          Each run yields a durable <strong class="text-(--text)">trace</strong> you can open and share.
        </p>
         <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.install}
    </div>
    <p class="text-[0.9375rem] m-0">
      <Button href="/compose" variant="default">Compose a chain now</Button>
      <small class="text-(--text-3) pb-3">Or</small>
      <a href="/tutorial" class="text-[0.8125rem] text-(--accent) hover:underline">Take the tutorial →</a>
        </p>
      </div>
    </header>
  </section>

  
  <div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-10">
  

  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">Try It</h2>
    </div>
    <p class="text-[0.9375rem] text-(--text-2)">
      Run a 3-step chain on Cloudflare's Workers Loaders. <br/>Edit the code, click Run, see the secure, isolated data flow.
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
</div>