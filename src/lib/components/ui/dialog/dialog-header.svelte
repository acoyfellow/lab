<script lang="ts">
	import { cn, type WithoutChildren } from "$lib/utils.js";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		class: className,
		children,
		...restProps
	}: WithoutChildren<HTMLAttributes<HTMLDivElement>> & { children?: Snippet } = $props();
</script>

<div
	data-slot="dialog-header"
	class={cn("flex flex-col gap-1.5 pb-3", className)}
	{...restProps}
>
	{@render children?.()}
</div>

