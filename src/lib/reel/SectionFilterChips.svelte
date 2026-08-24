<script lang="ts">
	// Session-only reel filter (not Settings — CONTEXT.md's Mute is permanent
	// and multi-select; this is a single-select "just show me Sports right now"
	// that resets the moment the page reloads).
	import { SECTIONS, SECTION_ACCENT, type Section } from '#lib/data/schema.js';
	import { cn } from '#lib/utils.js';

	let {
		value,
		onChange
	}: {
		value: Section | 'All';
		onChange: (section: Section | 'All') => void;
	} = $props();

	const chipClass =
		'shrink-0 rounded-full border px-3 py-1 font-mono text-[0.7rem] font-bold tracking-[0.04em] whitespace-nowrap uppercase transition';
</script>

<div role="group" aria-label="Filter the reel by section" class="flex gap-1.5">
	<button
		type="button"
		aria-pressed={value === 'All'}
		onclick={() => onChange('All')}
		class={cn(
			chipClass,
			value === 'All'
				? 'border-transparent bg-foreground text-background'
				: 'border-border bg-card/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
		)}
	>
		All
	</button>
	{#each SECTIONS as section (section)}
		<button
			type="button"
			aria-pressed={value === section}
			onclick={() => onChange(section)}
			style={value === section ? `--accent:${SECTION_ACCENT[section]}` : undefined}
			class={cn(
				chipClass,
				value === section
					? 'border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]'
					: 'border-border bg-card/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
			)}
		>
			{section}
		</button>
	{/each}
</div>
