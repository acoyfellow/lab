<script lang="ts">
  let {
    label = 'Raw JSON',
    text,
    defaultOpen = false,
  }: {
    label?: string;
    text: string;
    defaultOpen?: boolean;
  } = $props();
</script>

<details class="group" open={defaultOpen}>
  <summary
    class="cursor-pointer select-none text-[0.75rem] text-(--text-3) hover:text-(--text-2) mb-2 list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden"
  >
    <span class="font-(family-name:--mono)">{label}</span>
    <span class="text-[0.65rem] opacity-70">(toggle)</span>
  </summary>
  <pre
    class="bg-(--surface) rounded-(--radius) p-3 font-(family-name:--mono) text-xs whitespace-pre-wrap overflow-x-auto border border-(--border) mt-1"
  >{text}</pre>
</details>
