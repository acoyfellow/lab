<script lang="ts">
  import "../app.css";
  import SiteChrome from "$lib/SiteChrome.svelte";

  let { children } = $props();
</script>

<SiteChrome>
  {@render children()}
</SiteChrome>
