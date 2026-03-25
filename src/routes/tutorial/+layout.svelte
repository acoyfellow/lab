<script lang="ts">
  import TutorialStepNav from '$lib/tutorial/TutorialStepNav.svelte';

  let { children } = $props();
</script>

<div class="max-w-2xl mx-auto px-5 py-8 pb-16">
  <TutorialStepNav />
  {@render children()}
</div>
