<script lang="ts">
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
  import AutoResizeTextarea from '$lib/AutoResizeTextarea.svelte';
  import { ChainBuilder } from './index.js';

  let {
    view = $bindable<'builder' | 'raw'>('raw'),
    chainJson = $bindable(''),
    disabled = false
  } = $props();
</script>

<div class="h-full flex flex-col">
  <Tabs value={view} onValueChange={(v: string) => view = v as 'builder' | 'raw'} class="h-full flex flex-col">
    <TabsList class="w-full mb-4">
      <TabsTrigger value="builder" class="flex-1" {disabled}>Builder</TabsTrigger>
      <TabsTrigger value="raw" class="flex-1" {disabled}>Raw JSON</TabsTrigger>
    </TabsList>

    <div class="flex-1 min-h-0">
      <TabsContent value="builder" class="h-full mt-0">
        <ChainBuilder bind:chainJson {disabled} />
      </TabsContent>

      <TabsContent value="raw" class="h-full mt-0">
        <AutoResizeTextarea
          bind:value={chainJson}
          minRows={12}
          maxRows={50}
        />
      </TabsContent>
    </div>
  </Tabs>
</div>