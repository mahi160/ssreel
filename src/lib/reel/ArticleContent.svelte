<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { SECTION_ACCENT } from '#lib/data/schema.js';
	import * as Card from '@/ui/card/index.js';
	import { Button } from '@/ui/button/index.js';
	import { cn } from '@/utils.js';

	let { article, expanded }: { article: StoredArticle; expanded: boolean } = $props();

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
			<div class="absolute top-3 right-3 z-10 size-8 rounded-full border bg-background press-pass-hole" aria-hidden="true"></div>
			{#if article.image}
				<img src={article.image} alt="" class="h-42 w-full object-cover saturate-75 sm:h-56" loading="lazy" />
				<div class="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" aria-hidden="true"></div>
			{:else}
				<div class="h-18" aria-hidden="true"></div>
			{/if}
		</div>

		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-8">
			<div class="flex flex-col gap-5">
			<Card.Description class="flex flex-wrap items-center gap-2 text-[0.68rem] font-bold tracking-[0.28em] uppercase">
				<span class="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[var(--accent-foreground)]">{article.section}</span>
				<span>{article.source}</span>
				<span class="text-muted-foreground">{publishedLabel}</span>
			</Card.Description>

			<Card.Title class="max-w-[13ch] font-heading text-4xl leading-[0.94] font-black tracking-[-0.055em] normal-case sm:text-5xl lg:text-6xl">
				{article.headline}
			</Card.Title>

				<Card.Content class="px-0">
					<p class="max-w-prose whitespace-pre-line text-[1.02rem] leading-7 text-muted-foreground sm:text-lg sm:leading-8">
						{expanded ? article.body : article.excerpt}
					</p>
				</Card.Content>
			</div>
		</div>

		<div class="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t bg-secondary/55 px-5 py-4 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase sm:px-7">
			<span>{expanded ? 'Full brief open' : 'Tap card for brief'}</span>
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
			{:else}
				<span>Swipe left to hide</span>
			{/if}
		</div>
	</div>
</Card.Root>
