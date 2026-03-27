<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		children,
		...restProps
	}: CommandPrimitive.EmptyProps & { children?: Snippet } = $props();
</script>

<CommandPrimitive.Empty
	data-slot="command-empty"
	class={cn("py-10 text-center text-[0.85rem] text-(--text-3)", className)}
	{...restProps}
>
	{@render children?.()}
</CommandPrimitive.Empty>

