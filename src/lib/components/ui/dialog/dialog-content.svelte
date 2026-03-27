<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import type { WithElementRef, WithoutChildrenOrChild } from "$lib/utils.js";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		portalProps,
		overlayProps,
		closeProps,
		showCloseButton = true,
		class: className,
		children,
		...restProps
	}: WithoutChildrenOrChild<WithElementRef<DialogPrimitive.ContentProps>> & {
		portalProps?: DialogPrimitive.PortalProps;
		overlayProps?: DialogPrimitive.OverlayProps;
		closeProps?: DialogPrimitive.CloseProps;
		showCloseButton?: boolean;
		children: import("svelte").Snippet;
	} = $props();
</script>

<DialogPrimitive.Portal {...portalProps}>
	<DialogPrimitive.Overlay
		data-slot="dialog-overlay"
		class={cn("fixed inset-0 z-50 bg-black/50", overlayProps?.class)}
		{...overlayProps}
	/>
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2.5rem),40rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-(--border) bg-(--surface) p-4 shadow-2xl outline-none",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close
				data-slot="dialog-close"
				class={cn(
					"absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-(--radius) text-(--text-3) hover:bg-(--surface-alt) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--border)",
					closeProps?.class
				)}
				aria-label="Close"
				{...closeProps}
			>
				×
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>

