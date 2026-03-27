<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import type { WithElementRef } from "$lib/utils.js";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<CommandPrimitive.ItemProps> & { children?: Snippet } = $props();
</script>

<CommandPrimitive.Item
	bind:ref
	data-slot="command-item"
	class={cn(
		"aria-disabled:opacity-50 aria-disabled:pointer-events-none data-[selected=true]:bg-(--surface-alt) flex cursor-default select-none items-center gap-2 rounded-(--radius) px-2.5 py-2 text-[0.9rem] text-(--text-2) outline-none",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</CommandPrimitive.Item>

