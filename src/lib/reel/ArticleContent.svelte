<script lang="ts">
	import { IconExternalLink, IconX } from '@tabler/icons-svelte';
	import type { StoredArticle } from '#lib/data/db.js';
	import { SECTION_ACCENT } from '#lib/data/schema.js';
	import { formatElapsed } from '#lib/data/schedule.js';
	import { Button } from '#lib/ui/button/index.js';

	// The whole article — image, headline, meta, full body — is always shown;
	// there's no separate "brief" to expand into. onHide is optional only
	// because the desktop pane offers its own keyboard hide (Backspace); when
	// it's passed, a visible close button is the affordance for it, per
	// industry-standard swipeable-card news readers (Inshorts, Google News):
	// a tap target beats an undiscoverable gesture.
	let { article, onHide }: { article: StoredArticle; onHide?: () => void } = $props();

	// A dead og:image (link rot, moved CDN) should fall back to the accent
	// placeholder, not the browser's broken-image glyph.
	let imageFailed = $state(false);

	function handleHide() {
		navigator.vibrate?.(10); // no-op where unsupported (iOS Safari) — fine either way
		onHide?.();
	}

	// Relative while an article is fresh (matches the run cadence — see
	// schedule.ts), an absolute date once that stops being a useful measure.
	const publishedLabel = $derived(
		formatElapsed(new Date(article.publishedAt)) ??
			new Date(article.publishedAt).toLocaleString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			})
	);
</script>

<article
	style={`--accent:${SECTION_ACCENT[article.section]}`}
	class="flex h-full w-full flex-col overflow-hidden bg-card lg:max-w-2xl lg:rounded-3xl lg:border lg:shadow-xl"
>
	<div
		class="relative h-[34vh] max-h-80 w-full shrink-0 bg-[color-mix(in_oklch,var(--accent)_20%,var(--card))]"
	>
		{#if article.image && !imageFailed}
			<img
				src={article.image}
				alt=""
				class="h-full w-full object-cover"
				loading="lazy"
				onerror={() => (imageFailed = true)}
			/>
		{/if}
		<!-- Scrim so the glass chips read on a bright photo. -->
		<div
			class="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent"
			aria-hidden="true"
		></div>
		<!-- Fades the image into the card surface right where the headline panel overlaps it. -->
		<div
			class="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card via-card/60 to-transparent"
			aria-hidden="true"
		></div>
		<span
			class="absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-3 rounded-full border border-white/25 bg-[color-mix(in_oklch,var(--accent)_55%,transparent)] px-3 py-1 text-xs font-semibold text-white backdrop-blur-md"
		>
			{article.section}
		</span>
		{#if onHide}
			<button
				type="button"
				aria-label="Hide article"
				class="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 flex size-9 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition hover:bg-white/25 focus-visible:outline focus-visible:outline-white"
				onclick={handleHide}
			>
				<IconX size={18} />
			</button>
		{/if}
	</div>

	<!-- Glass panel overlapping the image's bottom edge — the "overlay" layer. -->
	<div
		class="relative -mt-5 shrink-0 rounded-t-3xl border-t bg-[var(--press-glass)] px-5 pt-4 pb-3 backdrop-blur-sm sm:px-7"
	>
		<p class="text-xs font-medium text-muted-foreground">
			{article.source} · {publishedLabel}
		</p>
		<h1 class="mt-1.5 text-xl leading-snug font-bold text-balance text-foreground sm:text-2xl">
			{article.headline}
		</h1>
	</div>

	<!-- No overscroll-contain here: once this runs out, the swipe should chain
	     to the outer reel and page to the next card, not dead-end (see Reel.svelte). -->
	<div class="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5 sm:px-7">
		<p
			class="max-w-prose text-[0.95rem] leading-relaxed whitespace-pre-line text-foreground/80 sm:text-base"
		>
			{article.body}
		</p>
	</div>

	<div class="flex shrink-0 justify-end border-t bg-card px-5 py-3 sm:px-7">
		<Button
			href={article.url}
			target="_blank"
			rel="noopener noreferrer"
			variant="outline"
			size="sm"
			class="gap-1.5"
		>
			Read original
			<IconExternalLink size={14} data-icon="inline-end" />
		</Button>
	</div>
</article>
