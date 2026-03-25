<script lang="ts">
  import { page } from '$app/state';
  import AppLink from '$lib/AppLink.svelte';
  import DocFooterNav from '$lib/DocFooterNav.svelte';
  import { paths } from '$lib/paths';

  let { children } = $props();

  function navClass(href: string): string {
    const base =
      'text-[0.8125rem] no-underline hover:text-(--text) transition-colors';
    const p = page.url.pathname;
    const active =
      href === '/'
        ? p === '/'
        : p === href || (href !== '/' && p.startsWith(href + '/'));
    return active
      ? `${base} text-(--text) font-medium`
      : `${base} text-(--text-3)`;
  }
</script>

<div class="min-h-dvh flex flex-col">
  <header
    class="border-b border-(--border) bg-(--surface) sticky top-0 z-10"
  >
    <div
      class="max-w-2xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <AppLink to="/" class="flex items-center gap-2 shrink-0 no-underline">
        <img src="/logo.svg" alt="lab" class="h-7" />
      </AppLink>
      <nav
        class="flex flex-wrap items-center gap-x-4 gap-y-1 justify-end text-[0.8125rem]"
      >
        <AppLink to="/tutorial" class={navClass('/tutorial')}>Tutorial</AppLink>
        <AppLink to="/guides" class={navClass('/guides')}>Guides</AppLink>
        <AppLink to={paths.docs} class={navClass(paths.docs)}>Docs</AppLink>
        <AppLink to="/examples" class={navClass('/examples')}>Examples</AppLink>
        <AppLink to="/compose" class={navClass('/compose')}>Compose</AppLink>
      </nav>
    </div>
  </header>

  <main class="flex-1 w-full">
    {@render children()}
  </main>

  <footer class="border-t border-(--border) mt-auto py-8 bg-(--bg)">
    <div class="max-w-2xl mx-auto px-5">
      <DocFooterNav
        compactTop
        gridClass="sm:grid-cols-2 lg:grid-cols-3"
        links={[
          {
            label: 'Docs hub',
            to: paths.docs,
            description: 'HTTP API, TypeScript, architecture, capabilities, traces.',
          },
          {
            label: 'Compose',
            to: '/compose',
            description: 'Run modes in the browser against the Worker.',
          },
          {
            label: 'Trace schema',
            to: paths.docsTraceSchema,
            description: 'Shape of GET /t/:id and POST traceId.',
          },
        ]}
      />
    </div>
  </footer>
</div>
