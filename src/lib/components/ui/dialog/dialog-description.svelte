<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		class: className,
		children,
		...restProps
	}: DialogPrimitive.DescriptionProps & { children?: Snippet } = $props();
</script>

<DialogPrimitive.Description
	data-slot="dialog-description"
	class={cn("text-[0.8125rem] text-(--text-3)", className)}
	{...restProps}
>
	{@render children?.()}
</DialogPrimitive.Description>

