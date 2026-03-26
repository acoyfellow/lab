<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import SEO from '$lib/SEO.svelte';
  import { paths } from '$lib/paths';
  import { GraduationCap, Play, Zap } from '@lucide/svelte';
  
  const navSections = [
    {
      title: 'Start',
      items: [
        { label: 'Introduction', to: '/docs', active: true },
        { label: 'Installation', to: '/docs/install' },
        { label: 'Self-Hosting', to: '/docs/self-host' },
        { label: 'How It Works', to: '/docs/how-it-works' },
        { label: 'Tutorial', to: paths.tutorial },
      ]
    },
    {
      title: 'Guides',
      items: [
        { label: 'When to use Lab', to: paths.docsWhenToUse },
        { label: 'HTTP API', to: paths.docsHttpApi },
        { label: 'TypeScript Client', to: paths.docsTypescript },
        { label: 'Agent Integration', to: paths.docsAgentIntegration },
        { label: 'Capabilities', to: paths.docsCapabilities },
      ]
    },
    {
      title: 'Reference',
      items: [
        { label: 'Limits', to: paths.docsLimits },
        { label: 'Security', to: paths.docsSecurity },
        { label: 'Failures & traces', to: paths.docsFailures },
        { label: 'Architecture', to: paths.docsArchitecture },
        { label: 'Trace Schema', to: paths.docsTraceSchema },
      ]
    }
  ];
  
  const mainCards = [
    {
      to: '/docs/self-host',
      title: 'Self-Hosting',
      description: 'Deploy to Cloudflare. Infrastructure setup, configuration, deployment.',
      tags: ['Production', 'Cloudflare']
    },
    {
      to: paths.docsHttpApi,
      title: 'HTTP API',
      description: 'Run modes, endpoints, curl, request/response shapes.',
      tags: ['REST', 'JSON']
    },
    {
      to: paths.docsAgentIntegration,
      title: 'Agents',
      description: 'MCP find + execute, or GET /lab/catalog + HTTP runs.',
      tags: ['MCP', 'AI']
    },
    {
      to: paths.docsTypescript,
      title: 'TypeScript Client',
      description: '@acoyfellow/lab — install, createLabClient, methods.',
      tags: ['npm', 'TypeScript']
    },
    {
      to: paths.docsWhenToUse,
      title: 'When to use Lab',
      description: 'Good fit vs poor fit; relationship to plain Workers.',
      tags: ['Product']
    },
    {
      to: paths.docsArchitecture,
      title: 'Architecture',
      description: 'Worker loaders, Effect, KV snapshot, spawn, chains.',
      tags: ['Cloudflare', 'Effect']
    },
    {
      to: paths.docsCapabilities,
      title: 'Capabilities',
      description: 'KV snapshot, spawn, why shims exist.',
      tags: ['Security']
    },
    {
      to: paths.docsTraceSchema,
      title: 'Trace JSON',
      description: 'GET /t/:id document — fields, tables, POST traceId.',
      tags: ['Schema']
    },
    {
      to: paths.docsLimits,
      title: 'Limits',
      description: 'Repo-enforced caps, chains, R2 invoke, platform limits.',
      tags: ['Reference']
    },
    {
      to: paths.docsSecurity,
      title: 'Security model',
      description: 'Untrusted guest code, capabilities, operators.',
      tags: ['Reference']
    },
    {
      to: paths.docsFailures,
      title: 'Failures & traces',
      description: 'Chain errors, empty trace on failure, isolate reasons.',
      tags: ['Reference']
    }
  ];
  
  const tocItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'quick-start', label: 'Quick Start' },
    { id: 'guides', label: 'Guides' },
    { id: 'reference', label: 'Reference' },
  ];
</script>

<SEO
  title="Docs — lab"
  description="HTTP API, architecture, limits, security, failures, TypeScript client, capabilities, and trace JSON."
  path="/docs"
  type="website"
/>

<div class="max-w-[1200px] mx-auto px-6 py-8">
  <div class="flex gap-8">
    <!-- Left Sidebar - Navigation -->
    <aside class="hidden lg:block w-64 shrink-0">
      <nav class="sticky top-8 space-y-6">
        {#each navSections as section}
          <div>
            <h3 class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-2 px-3">
              {section.title}
            </h3>
            <ul class="space-y-0.5">
              {#each section.items as item}
                <li>
                  <a 
                    href={item.to}
                    class="block px-3 py-1.5 text-[0.8125rem] rounded-(--radius) no-underline transition-colors {item.active ? 'text-(--accent) bg-(--accent)/5 font-medium' : 'text-(--text-2) hover:text-(--text) hover:bg-(--surface)'}">
                    {item.label}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 min-w-0">
      <div class="space-y-8">
        <header id="overview" class="space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Documentation</h1>
          <p class="text-[0.9375rem] text-(--text-2) max-w-2xl">
            Everything you need to run JavaScript in Cloudflare isolates. 
            From quick starts to deep dives on architecture and the HTTP API.
          </p>
        </header>

        <section id="quick-start" class="space-y-4">
          <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Quick Start
          </h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <a 
              href="/docs/install"
              class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
            >
              <div class="flex items-center gap-2 mb-2">
                <Zap class="w-4 h-4 text-(--text-2) group-hover:text-(--accent)" />
                <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">Install</h3>
              </div>
              <p class="text-[0.8125rem] text-(--text-2)">
                Deploy to Cloudflare. D1, R2, KV setup included.
              </p>
            </a>
            <a 
              href={paths.tutorial}
              class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
            >
              <div class="flex items-center gap-2 mb-2">
                <GraduationCap class="w-4 h-4 text-(--text-2) group-hover:text-(--accent)" />
                <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">Tutorial</h3>
              </div>
              <p class="text-[0.8125rem] text-(--text-2)">
                Three short steps with live runners. Learn by doing.
              </p>
            </a>
            <a 
              href="/compose"
              class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
            >
              <div class="flex items-center gap-2 mb-2">
                <Play class="w-4 h-4 text-(--text-2) group-hover:text-(--accent)" />
                <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">Compose</h3>
              </div>
              <p class="text-[0.8125rem] text-(--text-2)">
                Skip ahead and start building in the browser.
              </p>
            </a>
          </div>
        </section>

        <!-- Guides Section -->
        <section id="guides" class="space-y-4">
          <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Guides
          </h2>
          <div class="grid gap-4 sm:grid-cols-2">
            {#each mainCards.slice(0, 5) as card}
              <AppLink
                to={card.to}
                class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:bg-(--surface-alt) no-underline group"
              >
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">{card.title}</h3>
                  <div class="flex gap-1">
                    {#each card.tags as tag}
                      <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3)">{tag}</span>
                    {/each}
                  </div>
                </div>
                <p class="text-[0.8125rem] text-(--text-2)">{card.description}</p>
              </AppLink>
            {/each}
          </div>
        </section>

        <!-- Reference Section -->
        <section id="reference" class="space-y-4">
          <h2 class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Reference
          </h2>
          <div class="grid gap-4 sm:grid-cols-2">
            {#each mainCards.slice(5) as card}
              <AppLink
                to={card.to}
                class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:bg-(--surface-alt) no-underline group"
              >
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">{card.title}</h3>
                  <div class="flex gap-1">
                    {#each card.tags as tag}
                      <span class="text-[0.625rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3)">{tag}</span>
                    {/each}
                  </div>
                </div>
                <p class="text-[0.8125rem] text-(--text-2)">{card.description}</p>
              </AppLink>
            {/each}
          </div>
        </section>
      </div>
    </main>

    <!-- Right Sidebar - TOC -->
    <aside class="hidden xl:block w-48 shrink-0">
      <nav class="sticky top-8">
        <h3 class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) mb-3">
          On this page
        </h3>
        <ul class="space-y-1 border-l border-(--border)">
          {#each tocItems as item}
            <li>
              <a 
                href="#{item.id}"
                class="block pl-3 py-1 text-[0.8125rem] text-(--text-2) hover:text-(--text) no-underline border-l-2 border-transparent hover:border-(--text-3) transition-colors"
              >
                {item.label}
              </a>
            </li>
          {/each}
        </ul>
      </nav>
    </aside>
  </div>
</div>