<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { getDocsNavSections } from '$lib/docs-nav';

  let {
    tocItems = [],
    children,
  }: {
    tocItems?: { id: string; label: string }[];
    children: Snippet;
  } = $props();

  const navSections = $derived(getDocsNavSections(page.url.pathname));
</script>

<div class="max-w-[1200px] mx-auto px-6 py-8">
  <div class="flex gap-8">
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
                    class="block px-3 py-1.5 text-[0.8125rem] rounded-(--radius) no-underline transition-colors {item.active
                      ? 'text-(--accent) bg-(--accent)/5 font-medium'
                      : 'text-(--text-2) hover:text-(--text) hover:bg-(--surface)'}"
                  >
                    {item.label}
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    </aside>

    <main class="flex-1 min-w-0">
      {@render children()}
    </main>

    {#if tocItems.length > 0}
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
    {/if}
  </div>
</div>
