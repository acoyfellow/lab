<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
	}: {
		ref?: HTMLTableCaptionElement | null;
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<caption
	bind:this={ref}
	data-slot="table-caption"
	class={cn("mt-4 text-sm text-muted-foreground", className)}
>
	{@render children?.()}
</caption>
