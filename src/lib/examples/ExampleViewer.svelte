<script lang="ts">
  import type { ExampleData } from './types';
  import ExampleCard from './ExampleCard.svelte';
  
  type Props = {
    data: ExampleData;
    interactive?: boolean;
  };
  
  let { data, interactive = true }: Props = $props();
  
  let activeTab = $state<'overview' | 'steps' | 'code'>('overview');
  let selectedStep = $state<number | null>(null);
</script>

<div class="max-w-4xl mx-auto">
  <ExampleCard {data} variant="full" onRun={interactive ? () => {} : undefined} />
</div>
