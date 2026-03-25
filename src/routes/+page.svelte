<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>lab — parallel work on the edge, chains, traces</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-12">
  <section class="scroll-mt-6 space-y-4" aria-labelledby="intro">
    <h1 id="intro" class="text-(--text) text-[1.35rem] sm:text-[1.5rem] font-semibold tracking-tight leading-snug">
      Parallelize work on the edge
    </h1>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      <strong class="text-(--text) font-medium">Start in the browser:</strong>
      <a href="/compose" class="text-(--text-2) underline underline-offset-2 hover:text-(--text)">Compose</a>
      runs isolates and lands you on a shareable
      <code class="font-(family-name:--mono) text-[0.8rem]">/t/:id</code> trace — no install required on a hosted demo.
    </p>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Fan out steps on <strong class="text-(--text) font-medium">Cloudflare Workers</strong> instead of on your laptop. You send a small request; the edge runs <strong class="text-(--text) font-medium">multiple isolates in parallel</strong> when the job allows it, or a <strong class="text-(--text) font-medium">chain</strong> when each step needs the last one’s output.
    </p>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Call it from anywhere—even a <strong class="text-(--text) font-medium">resource‑limited</strong> machine (thin client, no local sandbox).
    </p>
    <div class="flex flex-wrap gap-2 pt-1">
      <a
        href="/compose"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) no-underline hover:bg-(--accent-hover)"
      >Run in the browser</a>
      <a
        href="/examples"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >Browse examples</a>
      <a
        href="#from-code"
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >Call from TypeScript</a>
      <AppLink
        to={paths.docs}
        class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
      >Docs</AppLink>
    </div>
  </section>

  <section id="from-code" class="scroll-mt-6 space-y-3" aria-labelledby="code-heading">
    <h2 id="code-heading" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3)">
      TypeScript client
    </h2>
    <p class="text-[0.8125rem] text-(--text-2) leading-relaxed m-0">
      <code class="font-(family-name:--mono) text-[0.75rem]">npm install @acoyfellow/lab</code>.
      <code class="font-(family-name:--mono) text-[0.75rem]">baseUrl</code> = the HTTP origin that serves your lab Worker’s
      <code class="text-[0.75rem]">/run/*</code> and <code class="text-[0.75rem]">/t/:id</code> (your deploy, not a vendor-only host). Use from scripts, CI, or anything that can call HTTP.
    </p>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
  </section>

  <section class="border-t border-(--border) pt-8 space-y-6" aria-labelledby="home-docs">
    <div class="space-y-2">
      <h2 id="home-docs" class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) m-0">
        Docs
      </h2>
      <p class="text-[0.8125rem] text-(--text-2) leading-relaxed m-0 max-w-[62ch]">
        Reference for the Worker and client lives here—HTTP API, TypeScript client, architecture, traces.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <AppLink
        to={paths.docsHttpApi}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">HTTP API</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Run modes, endpoints, curl, request/response shapes.</div>
      </AppLink>
      <AppLink
        to={paths.docsTypescript}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">TypeScript client</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
          <code class="font-(family-name:--mono) text-[0.7rem]">@acoyfellow/lab</code> — install, <code class="text-[0.7rem]">createLabClient</code>, methods.
        </div>
      </AppLink>
      <AppLink
        to={paths.docsArchitecture}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Architecture</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Worker loaders, Effect, KV snapshot, spawn, chains.</div>
      </AppLink>
      <AppLink
        to={paths.docsCapabilities}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Capabilities</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">KV snapshot, spawn, why shims exist.</div>
      </AppLink>
      <AppLink
        to={paths.docsTraceSchema}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Trace JSON</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">
          <code class="font-(family-name:--mono) text-[0.7rem]">GET /t/:id</code> — fields, tables, <code class="text-[0.7rem]">traceId</code>.
        </div>
      </AppLink>
      <a
        href="/tutorial"
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-1">Tutorial</div>
        <div class="text-[0.8125rem] text-(--text-2) leading-relaxed">Golden path: seed, Compose, trace URL, fork.</div>
      </a>
    </div>
  </section>
</div>
