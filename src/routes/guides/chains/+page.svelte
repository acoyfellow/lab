<svelte:head>
  <title>Chains - lab</title>
</svelte:head>

<div class="max-w-[720px] mx-auto px-5 py-8 pb-16 text-[0.8125rem] text-(--text-2) leading-relaxed">
  <p class="mb-6">
    <a href="/guides" class="text-(--text-3) no-underline hover:text-(--text)">Guides</a>
    <span class="text-(--text-3)"> / </span>
    <span class="text-(--text)">Chains</span>
  </p>
  <h1 class="text-lg font-semibold text-(--text) tracking-tight mb-4">Chains</h1>
  <p class="max-w-[62ch] mb-6">
    Use a chain when each step needs the previous step&rsquo;s output as <code class="font-(family-name:--mono) text-[0.75rem]">input</code>, with different capabilities per step, and you want a full
    <code class="font-(family-name:--mono) text-[0.75rem]">trace</code> array on the result.
  </p>
  <p class="max-w-[62ch] mb-6">
    Try it in <a href="/compose" class="underline underline-offset-2 hover:text-(--text)">Compose</a> (Chain mode) or call <code class="font-(family-name:--mono) text-[0.75rem]">POST /run/chain</code> from scripts.
  </p>
  <p class="max-w-[62ch] mb-8">
    <strong class="text-(--text) font-medium">Details:</strong>
    <a
      href="https://github.com/acoyfellow/lab#how-to-run-a-chain"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >README &mdash; How to run a chain</a
    >
    &middot;
    <a
      href="https://github.com/acoyfellow/lab#run-modes"
      target="_blank"
      rel="noopener noreferrer"
      class="underline underline-offset-2 hover:text-(--text)"
      >Run modes</a
    >.
  </p>
</div>
