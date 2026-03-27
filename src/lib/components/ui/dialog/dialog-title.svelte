<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		children,
		...restProps
	}: DialogPrimitive.TitleProps & { children?: Snippet } = $props();
</script>

<DialogPrimitive.Title
	data-slot="dialog-title"
	class={cn("text-[0.95rem] font-semibold tracking-tight text-(--text)", className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Title>

