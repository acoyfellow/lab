<script lang="ts">
	import { Command as CommandPrimitive } from "bits-ui";
	import type { WithElementRef, WithoutChildrenOrChild } from "$lib/utils.js";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		value = $bindable(""),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<WithElementRef<CommandPrimitive.InputProps>> = $props();
</script>

<div data-slot="command-input-wrap" class="flex items-center gap-2 border-b border-(--border) px-3 py-2">
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		class="h-4 w-4 text-(--text-3)"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</svg>
	<CommandPrimitive.Input
		bind:ref
		bind:value
		data-slot="command-input"
		class={cn(
			"placeholder:text-(--text-3) h-9 w-full bg-transparent text-[0.95rem] outline-none",
			className
		)}
		{...restProps}
	/>
</div>

