<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { dwellTracker } from './dwell.js';
	import { cardGestures } from './gestures.js';
	import * as Card from '@/ui/card/index.js';
	import { Button } from '@/ui/button/index.js';
	import { cn } from '@/utils.js';

	let {
		article,
		onRead,
		onHide
	}: { article: StoredArticle; onRead: (dwellMs: number) => void; onHide: () => void } = $props();

	let expanded = $state(false);
</script>

<div
	class="flex h-dvh w-full snap-start snap-always items-center justify-center p-4"
	use:dwellTracker={onRead}
	use:cardGestures={{ onTap: () => (expanded = !expanded), onHide }}
>
	<Card.Root
		class={cn('h-full w-full max-w-md overflow-y-auto', !article.image && 'justify-center')}
	>
		{#if article.image}
			<img src={article.image} alt="" class="aspect-video w-full object-cover" loading="lazy" />
		{/if}
		<Card.Header>
			<Card.Description>{article.source} · {article.section}</Card.Description>
			<Card.Title class="text-2xl">{article.headline}</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4">
			<p class="text-muted-foreground">{expanded ? article.body : article.excerpt}</p>
			{#if expanded}
				<!-- stopPropagation keeps this tap from also toggling the card closed; relies on
				     Button rendering an <a> because href is set (src/lib/ui/button/button.svelte). -->
				<Button
					href={article.url}
					target="_blank"
					rel="noopener"
					variant="outline"
					class="self-start"
					onpointerdown={(e) => e.stopPropagation()}
					onpointerup={(e) => e.stopPropagation()}
				>
					Open original
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
