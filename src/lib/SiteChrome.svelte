<script lang="ts">
  import { page } from '$app/state';
  import AppLink from '$lib/AppLink.svelte';
  import CommandPalette from "$lib/CommandPalette.svelte";
  import Logo from '$lib/Logo.svelte';
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
      ? `${base} text-(--text) underline underline-offset-4`
      : `${base} text-(--text-3)`;
  }
</script>

<div class="min-h-dvh flex flex-col">
  <CommandPalette />
  <div
    class="fixed inset-0 -z-1 pointer-events-none opacity-[0.035] mix-blend-multiply"
    style="background-image: url(&quot;data:image/svg+xml,%3Csvg%20viewBox%3D%270%200%20200%20200%27%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%270.7%27%20numOctaves%3D%272%27%20stitchTiles%3D%27stitch%27/%3E%3CfeColorMatrix%20type%3D%27matrix%27%20values%3D%270.33%200.33%200.33%200%200%200.33%200.33%200.33%200%200%200.33%200.33%200.33%200%200%200%200%200%201%200%27/%3E%3C/filter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url(%2523n)%27%20opacity%3D%270.55%27/%3E%3C/svg%3E&quot;); background-size: 260px 260px; filter: contrast(110%) brightness(105%);"
  ></div>
  <div class="fixed inset-0 -z-1 pointer-events-none">
    <div
      class="absolute inset-0 bg-cover bg-position-[center_bottom] bg-no-repeat"
      style="background-image: url('/bg.jpg');"
    ></div>
    <div
      class="absolute inset-0"
      style="background: linear-gradient(to bottom, rgba(250, 250, 250, 1) 0%, rgba(250, 250, 250, 1) 55%, rgba(250, 250, 250, 0.65) 72%, rgba(250, 250, 250, 0.25) 86%, rgba(250, 250, 250, 0) 100%);"
    ></div>
  </div>
  <header
    class="border-b border-(--border) bg-(--surface)/90 sticky top-0 z-50 backdrop-blur-sm"
  >
    <div
      class="max-w-3xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-3"
    >
      <AppLink to="/" class="flex items-center gap-2 shrink-0 no-underline">
        <Logo />
        <code class="text-[0.6rem] text-(--text-3) tracking-tight">v0.0.1</code>
      </AppLink>
      <nav
        class="flex flex-wrap items-center gap-x-4 gap-y-1 justify-end text-[0.8125rem]"
      >
        <AppLink to={paths.docs} class={navClass(paths.docs)}>Docs</AppLink>
        <AppLink to="/examples" class={navClass('/examples')}>Examples</AppLink>
        <AppLink to="/experiments" class={navClass('/experiments')}>Experiments</AppLink>
        <AppLink to="/compose" class={navClass('/compose')}>Compose</AppLink>
        <a
          href="https://github.com/acoyfellow/lab"
          class="inline-flex items-center justify-center w-8 h-8 rounded-(--radius) text-(--text-3) hover:text-(--text) hover:bg-(--surface-alt) transition-colors"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg
            viewBox="0 0 24 24"
            class="w-4 h-4"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.48 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.38-3.37-1.38-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05.8-.23 1.65-.34 2.5-.34.85 0 1.7.12 2.5.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.95-2.34 4.82-4.57 5.08.36.32.68.95.68 1.92 0 1.38-.01 2.5-.01 2.84 0 .27.18.59.69.48A10.03 10.03 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z"
            />
          </svg>
        </a>
      </nav>
    </div>
  </header>

  <main class="flex-1 w-full">
    {@render children()}
  </main>

  <footer class="border-t border-(--border) mt-auto py-8 bg-(--bg)">
    <div class="max-w-3xl mx-auto px-5">
      <div class="grid gap-8 sm:grid-cols-3 text-[0.8125rem]">
        <div class="space-y-2">
          <div class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Build
          </div>
          <div class="flex flex-col gap-1.5">
            <AppLink to="/compose" class="text-(--text-2) no-underline hover:text-(--text)">Compose</AppLink>
            <AppLink to="/examples" class="text-(--text-2) no-underline hover:text-(--text)">Examples</AppLink>
            <AppLink to="/experiments" class="text-(--text-2) no-underline hover:text-(--text)">Experiments</AppLink>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Learn
          </div>
          <div class="flex flex-col gap-1.5">
            <AppLink to={paths.docs} class="text-(--text-2) no-underline hover:text-(--text)">Docs</AppLink>
            <AppLink to={paths.tutorial} class="text-(--text-2) no-underline hover:text-(--text)">Tutorial</AppLink>
            <AppLink to={paths.docsHttpApi} class="text-(--text-2) no-underline hover:text-(--text)">HTTP API</AppLink>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-[0.75rem] font-semibold uppercase tracking-wider text-(--text-3)">
            Project
          </div>
          <div class="flex flex-col gap-1.5">
            <a
              href="https://github.com/acoyfellow/lab"
              class="text-(--text-2) no-underline hover:text-(--text)"
            >GitHub</a>
            <AppLink to="/docs/self-host" class="text-(--text-2) no-underline hover:text-(--text)">Self-host</AppLink>
          </div>
        </div>
      </div>

      <div class="mt-8 pt-5 border-t border-(--border) flex flex-wrap gap-x-4 gap-y-2 items-center justify-between text-[0.75rem] text-(--text-3)">
        <div>© {new Date().getFullYear()} lab.coey.dev</div>
      </div>
    </div>
  </footer>
</div>
