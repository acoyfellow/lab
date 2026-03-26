<script lang="ts">
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
  import { Textarea } from '$lib/components/ui/textarea';
  import { ChainBuilder } from './index.js';

  let {
    view = $bindable<'builder' | 'raw'>('raw'),
    chainJson = $bindable(''),
    disabled = false,
    /** Increment from parent when chainJson is replaced externally (preset / fork). */
    chainResetKey = 0
  } = $props();

  /** When switching Raw JSON → Builder, remount ChainBuilder so steps re-parse. */
  let builderSwapKey = $state(0);
</script>

<div class="h-full flex flex-col">
  <Tabs
    value={view}
    onValueChange={(v: string) => {
      const next = v as 'builder' | 'raw';
      if (next === 'builder' && view === 'raw') builderSwapKey++;
      view = next;
    }}
    class="h-full flex flex-col"
  >
    <TabsList class="w-full mb-4">
      <TabsTrigger value="builder" class="flex-1" {disabled}>Builder</TabsTrigger>
      <TabsTrigger value="raw" class="flex-1" {disabled}>Raw JSON</TabsTrigger>
    </TabsList>

    <div class="flex-1 min-h-0">
      <TabsContent value="builder" class="h-full mt-0">
        {#key `${chainResetKey}-${builderSwapKey}`}
          <ChainBuilder bind:chainJson {disabled} />
        {/key}
      </TabsContent>

      <TabsContent value="raw" class="h-full mt-0">
        <Textarea
          bind:value={chainJson}
          class="min-h-[400px] font-mono text-xs h-full"
        />
      </TabsContent>
    </div>
  </Tabs>
</div>
