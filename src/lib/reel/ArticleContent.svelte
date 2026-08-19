<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import * as Card from '@/ui/card/index.js';
	import { Button } from '@/ui/button/index.js';
	import { cn } from '@/utils.js';

	let { article, expanded }: { article: StoredArticle; expanded: boolean } = $props();
</script>

<Card.Root class={cn('h-full w-full max-w-md overflow-y-auto', !article.image && 'justify-center')}>
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
			<!-- stopPropagation keeps a tap on the mobile card from also toggling it closed; relies on
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
