<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		children,
		...restProps
	}: WithElementRef<CommandPrimitive.RootProps> & { value?: string; children?: Snippet } = $props();
</script>

<CommandPrimitive.Root
	bind:ref
	bind:value
	data-slot="command"
	class={cn(
		"bg-(--surface) text-(--text) flex h-full w-full flex-col overflow-hidden rounded-xl",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</CommandPrimitive.Root>

