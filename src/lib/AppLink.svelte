<script lang="ts">
  import { resolve } from '$app/paths';
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  type Props = {
    to: string;
    children: Snippet;
  } & Omit<HTMLAnchorAttributes, 'href'>;

  let { to, children, ...rest }: Props = $props();
  const href = $derived(resolve(to as '/'));
</script>

<a {href} {...rest}>{@render children()}</a>
