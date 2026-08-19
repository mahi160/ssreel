<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { markRead } from '#lib/data/db.js';
	import ArticleCard from './ArticleCard.svelte';

	let {
		articles,
		onActive,
		onRead,
		onHide
	}: {
		articles: StoredArticle[];
		onActive?: (id: string) => void;
		onRead: (id: string) => void;
		onHide: (id: string) => void;
	} = $props();

	function read(id: string, dwellMs: number) {
		// A hide's synchronous removal from `articles` always lands before this
		// (async, DOM-removal-triggered) callback fires — if it's already gone,
		// the article was hidden mid-dwell, and hide should win over the read.
		if (!articles.some((a) => a.id === id)) return;
		onRead(id); // instant: the card is already scrolled past
		markRead(id, dwellMs).catch((err) => console.error('markRead failed:', err));
	}
</script>

<div class="h-dvh w-full snap-y snap-mandatory overflow-y-auto">
	{#each articles as article (article.id)}
		<ArticleCard
			{article}
			onActive={() => onActive?.(article.id)}
			onRead={(dwellMs) => read(article.id, dwellMs)}
			onHide={() => onHide(article.id)}
		/>
	{/each}
</div>
