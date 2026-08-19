<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { markRead } from '#lib/data/db.js';
	import ArticleCard from './ArticleCard.svelte';

	let {
		articles,
		onRead,
		onHide
	}: { articles: StoredArticle[]; onRead: (id: string) => void; onHide: (id: string) => void } =
		$props();

	function read(id: string, dwellMs: number) {
		onRead(id); // instant: the card is already scrolled past
		markRead(id, dwellMs).catch((err) => console.error('markRead failed:', err));
	}
</script>

<div class="h-dvh w-full snap-y snap-mandatory overflow-y-auto">
	{#each articles as article (article.id)}
		<ArticleCard
			{article}
			onRead={(dwellMs) => read(article.id, dwellMs)}
			onHide={() => onHide(article.id)}
		/>
	{/each}
</div>
