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
	data-slot="dialog-footer"
	class={cn("flex items-center justify-end gap-2 pt-3", className)}
	{...restProps}
>
	{@render children?.()}
</div>

