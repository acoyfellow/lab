<svelte:head>
  <title>Spawn - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <a href="/guides" class="text-(--text-3) no-underline hover:text-(--text)">Guides</a>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">Spawn</span>
  </p>
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-4">Spawn</h1>
  <p class="max-w-[62ch] mb-6">
    A parent isolate can call <code class="font-(family-name:--mono) text-[0.75rem]">spawn(code, capabilities)</code> to run child isolates. Depth decreases each level; at 0, spawn is unavailable — this bounds recursion structurally.
  </p>
  <p class="max-w-[62ch] mb-6">
    Run from <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">Compose</a> (Spawn mode) or <code class="font-(family-name:--mono) text-[0.75rem]">POST /run/spawn</code>.
  </p>
  <p class="max-w-[62ch] mb-8">
    <strong class="text-(--text) font-medium">Details:</strong>
    <a
      href="https://github.com/acoyfellow/lab#how-to-spawn-child-isolates"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >README &mdash; How to spawn child isolates</a
    >.
  </p>
</div>
