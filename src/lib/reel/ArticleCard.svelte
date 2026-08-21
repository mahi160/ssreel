<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { dwellTracker } from './dwell.js';
	import ArticleContent from './ArticleContent.svelte';

	let {
		article,
		onActive,
		onRead,
		onHide
	}: {
		article: StoredArticle;
		onActive?: () => void;
		onRead: (dwellMs: number) => void;
		onHide: () => void;
	} = $props();
</script>

<!-- 92dvh, not 100dvh: the next card's top edge always peeks underneath,
     a constant "there's a stack here" cue. will-change promotes each card to
     its own compositor layer, so paging doesn't repaint siblings (ADR-0013). -->
<div
	class="h-[92dvh] w-full snap-start snap-always will-change-transform"
	data-article-id={article.id}
	use:dwellTracker={{ onActive, onRead }}
>
	<ArticleContent {article} {onHide} />
</div>
