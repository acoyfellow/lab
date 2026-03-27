<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		heading,
		children,
		...restProps
	}: WithElementRef<CommandPrimitive.GroupProps> & {
		heading?: string;
		children?: Snippet;
	} = $props();
</script>

<CommandPrimitive.Group
	bind:ref
	data-slot="command-group"
	class={cn(
		"**:data-[slot=command-group-heading]:px-2.5 **:data-[slot=command-group-heading]:py-2 **:data-[slot=command-group-heading]:text-[0.7rem] **:data-[slot=command-group-heading]:font-semibold **:data-[slot=command-group-heading]:uppercase **:data-[slot=command-group-heading]:tracking-wider **:data-[slot=command-group-heading]:text-(--text-3)",
		className
	)}
	{...restProps}
>
	{#if heading}
		<div data-slot="command-group-heading">{heading}</div>
	{/if}
	{@render children?.()}
</CommandPrimitive.Group>

