<script lang="ts">
  import AppLink from '$lib/AppLink.svelte';
  import { paths } from '$lib/paths';
</script>

<svelte:head>
  <title>Tutorial — lab</title>
</svelte:head>

<h1 class="text-lg font-semibold text-(--text) tracking-tight m-0 mb-4">Tutorial</h1>
<p class="text-[0.8125rem] text-(--text-2) leading-relaxed m-0 mb-6 max-w-[52ch]">
  Three short pages. Each has a live runner so you are hitting the real Worker from the lesson, not just reading.
</p>
<ul class="m-0 pl-5 space-y-3 text-[0.8125rem] text-(--text-2) list-disc marker:text-(--text-3)">
  <li>
    <AppLink to={paths.tutorialStep1} class="font-medium text-(--text) no-underline hover:underline"
      >Step 1</AppLink
    >
    — one isolate, one trace.
  </li>
  <li>
    <AppLink to={paths.tutorialStep2} class="font-medium text-(--text) no-underline hover:underline"
      >Step 2</AppLink
    >
    — multiple steps, one trace (a tiny program).
  </li>
  <li>
    <AppLink to={paths.tutorialStep3} class="font-medium text-(--text) no-underline hover:underline"
      >Step 3</AppLink
    >
    — several terminal agents, same <code class="font-(family-name:--mono) text-[0.7rem]">LAB_URL</code>, traces as handoff.
  </li>
</ul>
<p class="mt-8 mb-0">
  <AppLink
    to={paths.tutorialStep1}
    class="inline-flex items-center min-h-9 font-medium text-[0.8125rem] px-4 py-2 rounded-(--radius) bg-(--accent) text-white border border-(--accent) no-underline hover:bg-(--accent-hover)"
    >Start step 1</AppLink
  >
</p>
