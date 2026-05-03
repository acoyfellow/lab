<script lang="ts">
  import ResultPage from '../../results/[id]/+page.svelte';

  let { data }: { data: any } = $props();
</script>

<ResultPage {data} />
