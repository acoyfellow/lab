<script lang="ts">
  import type { PageProps } from './$types';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Lab — Offload untrusted code to the edge. Get a trace.</title>
  <meta name="description" content="Run JavaScript in Cloudflare isolates with least-privilege capabilities. Every execution produces a shareable, inspectable trace. Built for agents and orchestrators." />
</svelte:head>

<div class="max-w-2xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-16">
  <!-- Hero -->
  <section class="space-y-6" aria-labelledby="hero">
    <h1 id="hero" class="text-[1.65rem] sm:text-[2rem] font-semibold tracking-tight leading-[1.2]">
      Offload untrusted code to the edge.<br />
      <span class="text-(--accent)">Get a trace.</span>
    </h1>
    <p class="text-[1.0625rem] text-(--text-2) leading-relaxed max-w-[55ch]">
      Run JavaScript in Cloudflare isolates with least-privilege capabilities. Every execution produces a <strong class="text-(--text)">shareable, inspectable trace</strong> — code, capabilities, output, timing, structure. Built for agents and orchestrators who need to prove what ran.
    </p>
    <div class="flex flex-wrap gap-3 pt-1">
      <a
        href="/compose"
        class="inline-flex items-center min-h-10 font-semibold text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--accent) text-white border border-(--accent) no-underline hover:bg-(--accent-hover) transition-colors"
      >Try it now</a>
      <a
        href="/examples"
        class="inline-flex items-center min-h-10 font-medium text-[0.875rem] px-5 py-2.5 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt) transition-colors"
      >See example traces</a>
    </div>
    <p class="text-[0.8125rem] text-(--text-3)">
      No install. Runs in your browser. Produces real traces.
    </p>
  </section>

  <!-- Why This Exists -->
  <section class="space-y-5" aria-labelledby="why">
    <h2 id="why" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Why This Exists
    </h2>
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[1.25rem] font-semibold text-(--text)">Sandbox</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          You want to run AI-generated or user-submitted code safely, but local sandboxes are heavy and Docker is slow.
        </p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[1.25rem] font-semibold text-(--text)">Prove</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Your users need to see exactly what executed. Not logs. Not screenshots. A complete, inspectable trace.
        </p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[1.25rem] font-semibold text-(--text)">Scale</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          You need to fan out 20 tasks in parallel without managing infrastructure, queues, or promise arrays.
        </p>
      </div>
    </div>
  </section>

  <!-- Three Primitives -->
  <section class="space-y-5" aria-labelledby="primitives">
    <h2 id="primitives" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Three Primitives
    </h2>
    <div class="space-y-4">
      <div class="flex gap-4 items-start">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-(--accent) text-white flex items-center justify-center font-semibold text-[0.875rem]">1</div>
        <div class="space-y-1">
          <h3 class="text-[1.0625rem] font-semibold text-(--text)">Isolates</h3>
          <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
            Each run executes in a fresh V8 isolate on Cloudflare's edge. No cold starts. No container overhead. Milliseconds to first instruction.
          </p>
        </div>
      </div>
      <div class="flex gap-4 items-start">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-(--accent) text-white flex items-center justify-center font-semibold text-[0.875rem]">2</div>
        <div class="space-y-1">
          <h3 class="text-[1.0625rem] font-semibold text-(--text)">Capabilities</h3>
          <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
            Explicit permission model. Code only gets access to <code class="font-(family-name:--mono) text-[0.8rem]">kvRead</code>, <code class="font-(family-name:--mono) text-[0.8rem]">workersAi</code>, <code class="font-(family-name:--mono) text-[0.8rem]">spawn</code> if you declare it. No ambient authority. Least privilege by default.
          </p>
        </div>
      </div>
      <div class="flex gap-4 items-start">
        <div class="flex-shrink-0 w-8 h-8 rounded-full bg-(--accent) text-white flex items-center justify-center font-semibold text-[0.875rem]">3</div>
        <div class="space-y-1">
          <h3 class="text-[1.0625rem] font-semibold text-(--text)">Traces</h3>
          <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
            Every execution produces a durable artifact: exact code, granted capabilities, inputs, outputs, timing, structure. Share <code class="font-(family-name:--mono) text-[0.8rem]">/t/:id</code> links. Fork and rerun. Your trace is the source of truth.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- MCP Integration -->
  <section class="space-y-5" aria-labelledby="mcp">
    <h2 id="mcp" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Works With Your Agent
    </h2>
    <div class="rounded-(--radius) border border-(--accent) bg-(--accent)/5 p-5 space-y-4">
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
        Lab exposes a <strong class="text-(--text)">Model Context Protocol (MCP)</strong> server. Cursor, Claude Desktop, or any MCP host gets two tools:
      </p>
      <ul class="text-[0.9375rem] text-(--text-2) space-y-2 ml-4">
        <li><code class="font-(family-name:--mono) text-[0.8rem]">find</code> — Discover capabilities, templates, and past traces</li>
        <li><code class="font-(family-name:--mono) text-[0.8rem]">execute</code> — Run code with explicit capability grants</li>
      </ul>
      <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
        Your agent never guesses what it can do. It queries the catalog, then executes with exactly the permissions it needs.
      </p>
      <div class="pt-1">
        <AppLink
          to={paths.docsAgentIntegration}
          class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
        >Agent integration guide</AppLink>
      </div>
    </div>
  </section>

  <!-- Run Modes -->
  <section class="space-y-5" aria-labelledby="modes">
    <h2 id="modes" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Run Modes
    </h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--accent)">Sandbox</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Run a single JavaScript block. Get the result. Perfect for quick calculations or capability-probed code.
        </p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--accent)">KV Read</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Point-in-time snapshot of your KV namespace. Query with <code class="font-(family-name:--mono) text-[0.8rem]">kv.list()</code> and <code class="font-(family-name:--mono) text-[0.8rem]">kv.get()</code> inside the isolate.
        </p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--accent)">Chain</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Multi-step workflows. Each step is a new isolate. Output flows to input. Build data pipelines with explicit intermediate states.
        </p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2">
        <div class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--accent)">Spawn</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Parallel execution with depth limits. Call <code class="font-(family-name:--mono) text-[0.8rem]">spawn()</code> from inside a running isolate. Perfect for fan-out patterns.
        </p>
      </div>
      <div class="rounded-(--radius) border border-(--border) bg-(--surface) p-4 space-y-2 sm:col-span-2">
        <div class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--accent)">Generate</div>
        <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
          Send a prompt, get generated JavaScript. The generated code runs in an isolate with the capabilities you specify. AI agents writing sandboxed code — with full provenance.
        </p>
      </div>
    </div>
  </section>

  <!-- Code Example -->
  <section id="from-code" class="space-y-4" aria-labelledby="code-heading">
    <h2 id="code-heading" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      From TypeScript
    </h2>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      <code class="font-(family-name:--mono) text-[0.8125rem]">npm install @acoyfellow/lab</code>. Use from scripts, CI, or your own orchestrator.
    </p>
    <div class="shiki-code-block rounded-(--radius) border border-(--border) bg-(--code-bg) overflow-hidden">
      {@html data.codeHtml.client}
    </div>
    <p class="text-[0.8125rem] text-(--text-3)">
      Every run returns a <code class="font-(family-name:--mono) text-[0.75rem]">traceId</code>. Visit <code class="font-(family-name:--mono) text-[0.75rem]">/t/:traceId</code> to inspect, share, or fork.
    </p>
  </section>

  <!-- Self-host -->
  <section class="rounded-(--radius) border border-(--border) bg-(--surface) p-5 space-y-3" aria-labelledby="self-host">
    <h2 id="self-host" class="text-[0.8125rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Self-Host
    </h2>
    <p class="text-[0.9375rem] text-(--text-2) leading-relaxed">
      Your Cloudflare account. Your bindings (KV, AI, R2, D1, Durable Objects). Your control over capabilities. Deploy with Wrangler or Alchemy.
    </p>
    <a
      href="https://github.com/acoyfellow/lab#self-host"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--surface) text-(--text-2) border border-(--border) no-underline hover:bg-(--surface-alt)"
    >GitHub → Self-host guide</a>
  </section>

  <!-- Docs Grid -->
  <section class="border-t border-(--border) pt-8 space-y-5" aria-labelledby="docs">
    <h2 id="docs" class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
      Documentation
    </h2>
    <div class="grid gap-3 sm:grid-cols-2">
      <AppLink
        to={paths.docsHttpApi}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.8125rem] font-semibold mb-1">HTTP API</div>
        <div class="text-[0.8125rem] text-(--text-2)">Endpoints, curl, request/response shapes.</div>
      </AppLink>
      <AppLink
        to={paths.docsTypescript}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.8125rem] font-semibold mb-1">TypeScript Client</div>
        <div class="text-[0.8125rem] text-(--text-2)"><code class="font-(family-name:--mono) text-[0.7rem]">@acoyfellow/lab</code> — types, methods, Effect.</div>
      </AppLink>
      <AppLink
        to={paths.docsAgentIntegration}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.8125rem] font-semibold mb-1">Agent Integration</div>
        <div class="text-[0.8125rem] text-(--text-2)">MCP server, catalog, execute patterns.</div>
      </AppLink>
      <AppLink
        to={paths.docsCapabilities}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.8125rem] font-semibold mb-1">Capabilities</div>
        <div class="text-[0.8125rem] text-(--text-2)">Full matrix: bindings, grants, tradeoffs.</div>
      </AppLink>
      <AppLink
        to={paths.docsArchitecture}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.8125rem] font-semibold mb-1">Architecture</div>
        <div class="text-[0.8125rem] text-(--text-2)">Worker loaders, Effect, KV snapshots, chains.</div>
      </AppLink>
      <AppLink
        to={paths.tutorial}
        class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)"
      >
        <div class="text-[0.8125rem] font-semibold mb-1">Tutorial</div>
        <div class="text-[0.8125rem] text-(--text-2)">Three steps with inline runners.</div>
      </AppLink>
    </div>
  </section>
</div>
