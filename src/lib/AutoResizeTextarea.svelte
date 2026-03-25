<script lang="ts">
  type Props = {
    value: string;
    id?: string;
    minRows?: number;
    maxRows?: number;
    placeholder?: string;
  };
  
  let { 
    value = $bindable(),
    id,
    minRows = 3,
    maxRows = 30,
    placeholder
  }: Props = $props();
  
  let textarea: HTMLTextAreaElement;
  
  function autoResize() {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, minRows * 20),
      maxRows * 20
    );
    textarea.style.height = newHeight + 'px';
  }
  
  $effect(() => {
    if (textarea && value !== undefined) {
      autoResize();
    }
  });
</script>

<textarea
  bind:this={textarea}
  {id}
  bind:value
  {placeholder}
  oninput={autoResize}
  rows={minRows}
  class="w-full border border-(--border) rounded-(--radius) bg-(--surface) p-3 font-mono text-xs text-(--text) resize-none overflow-hidden"
  style="min-height: {minRows * 20}px; max-height: {maxRows * 20}px;"
></textarea>
