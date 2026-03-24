<script lang="ts">
  import { page } from '$app/state';
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';

  const GITHUB_README = 'https://github.com/acoyfellow/lab#readme';
  const GITHUB_REPO = 'https://github.com/acoyfellow/lab';

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
      class="max-w-[960px] mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3"
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
        <a
          href={GITHUB_README}
          target="_blank"
          rel="noopener noreferrer"
          class="text-[0.8125rem] text-(--text-3) no-underline hover:text-(--text)"
          >GitHub</a
        >
      </nav>
    </div>
  </header>

  <main class="flex-1 w-full">
    {@render children()}
  </main>

  <footer
    class="border-t border-(--border) mt-auto py-8 text-[0.75rem] text-(--text-3) leading-relaxed"
  >
    <div class="max-w-[960px] mx-auto px-5 space-y-2">
      <p class="m-0">
        <strong class="text-(--text-2) font-medium">Docs</strong> —
        <AppLink
          to={paths.docs}
          class="text-(--text-2) underline underline-offset-2 hover:text-(--text)"
          >Docs hub</AppLink
        >
        &middot;
        <a
          href={GITHUB_README}
          target="_blank"
          rel="noopener noreferrer"
          class="text-(--text-2) underline underline-offset-2 hover:text-(--text)"
          >README on GitHub</a
        >
        &middot;
        <AppLink
          to={paths.docsTraceSchema}
          class="text-(--text-2) underline underline-offset-2 hover:text-(--text)"
          >Trace schema</AppLink
        >
        &middot;
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noopener noreferrer"
          class="text-(--text-2) underline underline-offset-2 hover:text-(--text)"
          >Repo</a
        >
      </p>
    </div>
  </footer>
</div>
