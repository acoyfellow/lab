<script lang="ts">
  import Breadcrumbs from '$lib/Breadcrumbs.svelte';
  import { paths } from '$lib/paths';

  const items = [
    { href: paths.tutorial, label: 'Overview' },
    { href: paths.tutorialStep1, label: '1 · Trace' },
    { href: paths.tutorialStep2, label: '2 · Chain' },
    { href: paths.tutorialStep3, label: '3 · Agents' },
  ] as const;
</script>

<Breadcrumbs {items} ariaLabel="Tutorial steps" />
