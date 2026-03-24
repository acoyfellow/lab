<svelte:head>
  <title>Guides - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-2">Guides</h1>
  <p class="mb-8 max-w-[62ch]">
    Workflow-focused pages. For endpoint tables and curl, use the
    <a
      href="https://github.com/acoyfellow/lab#readme"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >README</a
    >.
  </p>

  <ul class="space-y-3 m-0 pl-0 list-none">
    <li>
      <a href="/guides/chains" class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1">Chains</span>
        <span class="text-[0.8125rem] text-(--text-2)">Multi-step pipelines, <code class="font-(family-name:--mono) text-[0.7rem]">POST /run/chain</code>, per-step traces.</span>
      </a>
    </li>
    <li>
      <a href="/guides/spawn" class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1">Spawn</span>
        <span class="text-[0.8125rem] text-(--text-2)">Child isolates, depth limits, <code class="font-(family-name:--mono) text-[0.7rem]">POST /run/spawn</code>.</span>
      </a>
    </li>
    <li>
      <a href="/guides/traces" class="block rounded-(--radius) border border-(--border) bg-(--surface) p-4 no-underline hover:bg-(--surface-alt) text-(--text)">
        <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--text-3) block mb-1">Traces</span>
        <span class="text-[0.8125rem] text-(--text-2)"><code class="font-(family-name:--mono) text-[0.7rem]">/t/&#123;id&#125;</code>, JSON export, fork back to Compose.</span>
      </a>
    </li>
  </ul>
</div>
