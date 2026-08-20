<script lang="ts">
	import { IconX } from '@tabler/icons-svelte';
	import type { StoredArticle } from '#lib/data/db.js';
	import { SECTION_ACCENT } from '#lib/data/schema.js';
	import * as Card from '#lib/ui/card/index.js';
	import { Button } from '#lib/ui/button/index.js';
	import { cn } from '#lib/utils.js';

	// onToggleExpand/onHide are only passed on mobile (ArticleCard): they give
	// keyboard/switch-access/screen-reader users a real button for what's
	// otherwise a tap-to-expand, swipe-to-hide gesture surface. The desktop
	// pane already has its own keyboard handling (up/down, enter, backspace)
	// so it renders this without them.
	let {
		article,
		expanded,
		onToggleExpand,
		onHide
	}: {
		article: StoredArticle;
		expanded: boolean;
		onToggleExpand?: () => void;
		onHide?: () => void;
	} = $props();

	const publishedLabel = $derived(
		new Date(article.publishedAt).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		})
	);
</script>

<Card.Root
	style={`--accent:${SECTION_ACCENT[article.section]}`}
	class={cn(
		'press-card scanline h-full max-h-full w-full max-w-md gap-0 overflow-hidden border bg-card p-0 ring-1 ring-foreground/10 lg:max-w-2xl',
		!article.image && 'justify-center'
	)}
>
	<div class="flex h-full min-h-0 flex-col">
		<div class="relative shrink-0 border-b bg-[color-mix(in_oklch,var(--accent)_10%,var(--card))]">
			<div
				class="press-pass-hole absolute top-3 right-3 z-10 size-8 rounded-full border bg-background"
				aria-hidden="true"
			></div>
			{#if article.image}
				<img
					src={article.image}
					alt=""
					class="h-42 w-full object-cover saturate-75 sm:h-56"
					loading="lazy"
				/>
				<div
					class="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent"
					aria-hidden="true"
				></div>
			{:else}
				<div class="h-18" aria-hidden="true"></div>
			{/if}
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-8">
			<div class="flex flex-col gap-5">
				<Card.Description
					class="flex flex-wrap items-center gap-2 text-[0.68rem] font-bold tracking-[0.28em] uppercase"
				>
					<span class="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[var(--accent-foreground)]"
						>{article.section}</span
					>
					<span>{article.source}</span>
					<span class="text-muted-foreground">{publishedLabel}</span>
				</Card.Description>

				<Card.Title
					class="max-w-[13ch] font-heading text-4xl leading-[0.94] font-black tracking-[-0.055em] normal-case sm:text-5xl lg:text-6xl"
				>
					{article.headline}
				</Card.Title>

				<Card.Content class="px-0">
					<p
						class="max-w-prose text-[1.02rem] leading-7 whitespace-pre-line text-muted-foreground sm:text-lg sm:leading-8"
					>
						{expanded ? article.body : article.excerpt}
					</p>
				</Card.Content>
			</div>
		</div>

		<div
			class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-secondary/55 px-5 py-4 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:px-7"
		>
			{#if onToggleExpand}
				<button
					type="button"
					class="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-ring"
					onpointerdown={(e) => e.stopPropagation()}
					onpointerup={(e) => e.stopPropagation()}
					onclick={onToggleExpand}
				>
					{expanded ? 'Collapse brief' : 'Tap card for brief'}
				</button>
			{:else}
				<span>{expanded ? 'Full brief open' : 'Tap card for brief'}</span>
			{/if}
			<div class="flex items-center gap-2">
				{#if expanded}
					<Button
						href={article.url}
						target="_blank"
						rel="noopener noreferrer"
						size="sm"
						onpointerdown={(e) => e.stopPropagation()}
						onpointerup={(e) => e.stopPropagation()}
					>
						Open original
					</Button>
				{:else if !onHide}
					<span>Swipe left to hide</span>
				{/if}
				{#if onHide}
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Hide article"
						onpointerdown={(e) => e.stopPropagation()}
						onpointerup={(e) => e.stopPropagation()}
						onclick={onHide}
					>
						<IconX />
					</Button>
				{/if}
			</div>
		</div>
	</div>
</Card.Root>
