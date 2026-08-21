<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { dwellTracker } from './dwell.js';
	import ArticleContent from './ArticleContent.svelte';
	import { cn } from '#lib/utils.js';

	let {
		article,
		peek,
		onActive,
		onRead,
		onHide
	}: {
		article: StoredArticle;
		/** True once GSAP owns paging (ADR-0012): slightly under full height, so
		 *  the next card always peeks at the bottom edge — the "stack" cue.
		 *  False is the prefers-reduced-motion fallback: full height, plain
		 *  CSS scroll-snap. */
		peek: boolean;
		onActive?: () => void;
		onRead: (dwellMs: number) => void;
		onHide: () => void;
	} = $props();
</script>

<div
	class={cn('w-full', peek ? 'h-[92dvh]' : 'h-dvh snap-start snap-always')}
	data-article-id={article.id}
	use:dwellTracker={{ onActive, onRead }}
>
	<ArticleContent {article} {onHide} />
</div>
