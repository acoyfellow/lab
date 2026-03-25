<script lang="ts">
  import "../app.css";
  import SiteChrome from "$lib/SiteChrome.svelte";
  import PreloadingIndicator from "$lib/PreloadingIndicator.svelte";
  import { navigating } from "$app/state";

  let { children } = $props();
</script>

<SiteChrome>
  {#if navigating.to}
    <PreloadingIndicator />
  {/if}

  {@render children()}
</SiteChrome>
