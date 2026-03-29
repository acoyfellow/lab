<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import DocsSequentialFooter from '$lib/DocsSequentialFooter.svelte';
  import DocsShell from '$lib/DocsShell.svelte';
  import SEO from '$lib/SEO.svelte';
  import { docsHubByGroup } from '$lib/docs-hub';
  import { paths } from '$lib/paths';
  import { GraduationCap, Play, Zap } from '@lucide/svelte';

  const hubSections = [
    { id: 'guides' as const, heading: 'Guides', cards: docsHubByGroup('guides') },
    { id: 'reference' as const, heading: 'Reference', cards: docsHubByGroup('reference') },
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

<DocsShell {tocItems}>
  <div class="max-w-3xl space-y-8 docs-prose">
    <header id="overview" class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Documentation</h1>
      <p class="max-w-2xl">
        Everything you need to run JavaScript in Cloudflare isolates. From quick starts to deep dives on
        architecture and the HTTP API.
      </p>
    </header>

    <section id="quick-start" class="space-y-4">
      <h2 class="docs-section-label">Quick Start</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <a
          href="/docs/install"
          class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
        >
          <div class="flex items-center gap-2 mb-2">
            <Zap class="w-4 h-4 text-(--text-2) group-hover:text-(--accent)" />
            <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">Install</h3>
          </div>
          <p>
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
          <p>Three short steps with live runners. Learn by doing.</p>
        </a>
        <a
          href="/compose"
          class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) transition-colors no-underline group"
        >
          <div class="flex items-center gap-2 mb-2">
            <Play class="w-4 h-4 text-(--text-2) group-hover:text-(--accent)" />
            <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">Compose</h3>
          </div>
          <p>Skip ahead and start building in the browser.</p>
        </a>
      </div>
    </section>

    {#each hubSections as block}
      <section id={block.id} class="space-y-4">
        <h2 class="docs-section-label">{block.heading}</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          {#each block.cards as card}
            <AppLink
              to={card.to}
              class="block p-5 rounded-(--radius) border border-(--border) bg-(--surface) hover:bg-(--surface-alt) no-underline group"
            >
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-semibold text-(--text) group-hover:text-(--accent)">{card.title}</h3>
                <div class="flex gap-1">
                  {#each card.tags as tag}
                    <span class="text-[0.6875rem] px-1.5 py-0.5 rounded bg-(--surface-alt) text-(--text-3)">{tag}</span>
                  {/each}
                </div>
              </div>
              <p>{card.description}</p>
            </AppLink>
          {/each}
        </div>
      </section>
    {/each}

    <DocsSequentialFooter />
  </div>
</DocsShell>
