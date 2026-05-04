<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import DocsSequentialFooter from '$lib/DocsSequentialFooter.svelte';
  import DocsShell from '$lib/DocsShell.svelte';
  import SEO from '$lib/SEO.svelte';
  import { DOCS_HUB_GROUPS, docsHubByGroup } from '$lib/docs-hub';

  const sections = DOCS_HUB_GROUPS.map((g) => ({
    ...g,
    cards: docsHubByGroup(g.id),
  }));

  const tocItems = sections.map((s) => ({ id: s.id, label: s.heading }));
</script>

<SEO
  title="Docs — Lab"
  description="Run JavaScript in Cloudflare V8 isolates. Every run gets a receipt URL. HTTP API, TypeScript client, capabilities, and operating guides."
  path="/docs"
  type="website"
/>

<DocsShell {tocItems}>
  <div class="max-w-3xl space-y-10 docs-prose">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Docs</h1>
      <p class="max-w-2xl">
        Lab runs JavaScript in V8 isolates and saves a receipt for every run. Pick a thread below — read top-to-bottom or jump to what you need.
      </p>
    </header>

    {#each sections as section}
      <section id={section.id} class="space-y-3">
        <div class="space-y-0.5">
          <h2 class="text-lg font-semibold text-(--text) m-0">{section.heading}</h2>
          <p class="text-[0.875rem] text-(--text-2) m-0">{section.subheading}</p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          {#each section.cards as card}
            <AppLink
              to={card.to}
              class="block p-4 rounded-(--radius) border border-(--border) bg-(--surface) hover:border-(--accent) no-underline group"
            >
              <div class="font-semibold text-(--text) group-hover:text-(--accent) text-[0.9375rem]">{card.title}</div>
              <p class="text-[0.8125rem] text-(--text-2) m-0 mt-1">{card.description}</p>
            </AppLink>
          {/each}
        </div>
      </section>
    {/each}

    <DocsSequentialFooter />
  </div>
</DocsShell>
