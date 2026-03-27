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
	}: WithElementRef<CommandPrimitive.ListProps> & { children?: Snippet } = $props();
</script>

<CommandPrimitive.List
	bind:ref
	data-slot="command-list"
	class={cn("max-h-88 overflow-auto p-1", className)}
	{...restProps}
>
	{@render children?.()}
</CommandPrimitive.List>

