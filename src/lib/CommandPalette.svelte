<script lang="ts">
	import { goto } from "$app/navigation";
	import * as Command from "$lib/components/ui/command/index.js";

	const items = [
		{ label: "Compose", href: "/compose" },
		{ label: "Tutorial", href: "/tutorial" },
		{ label: "Patterns", href: "/docs/patterns" },
		{ label: "Examples", href: "/examples" },
		{ label: "Sessions", href: "/sessions" },
		{ label: "Docs", href: "/docs" },
		{ label: "HTTP API", href: "/docs/http-api" },
		{ label: "Self-host", href: "/docs/self-host" },
	] as const;

	let open = $state(false);
	let value = $state("");

	function onKeydown(e: KeyboardEvent) {
		if (e.key.toLowerCase() !== "k") return;
		if (!(e.metaKey || e.ctrlKey)) return;
		e.preventDefault();
		open = !open;
	}

	function run(href: string) {
		open = false;
		value = "";
		goto(href);
	}
</script>

<svelte:document onkeydown={onKeydown} />

<Command.Dialog
	bind:open
	bind:value
	title="Command palette"
	description="⌘K to open • ↑/↓ to move • Enter to go"
>
	<Command.Input placeholder="Type to search…" />
	<Command.List>
		<Command.Empty>No results.</Command.Empty>
		<Command.Group heading="Navigate">
			{#each items as it}
				<Command.Item onSelect={() => run(it.href)}>
					<span>{it.label}</span>
					<Command.Shortcut>↵</Command.Shortcut>
				</Command.Item>
			{/each}
		</Command.Group>
	</Command.List>
</Command.Dialog>

