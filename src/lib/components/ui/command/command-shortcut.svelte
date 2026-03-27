<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement> & {
		children?: Snippet;
	} = $props();
</script>

<span
	bind:this={ref}
	data-slot="command-shortcut"
	class={cn("ml-auto text-[0.75rem] tracking-wide text-(--text-3)", className)}
	{...restProps}
>
	{@render children?.()}
</span>

