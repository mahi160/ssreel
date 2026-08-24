<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { dwellTracker } from './dwell.js';
	import { stackMotion } from './stackMotion.js';
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

<!-- Full height, no peek — the stacked-card depth cue is the scroll-linked
     scale/fade from stackMotion now, not a sliver of the next image showing
     underneath.

     The scale/fade lands on the inner wrapper, not this outer div: this outer
     one is the actual scroll-snap target, and browsers factor a transformed
     element's rendered box into snap-point math — scaling it directly made
     native snapping visibly jittery. This stays a stable, untransformed snap
     target; will-change (for its own compositor layer, so paging doesn't
     repaint siblings — ADR-0013) moves to the element that actually animates. -->
<div
	class="h-dvh w-full snap-start snap-always"
	data-article-id={article.id}
	use:dwellTracker={{ onActive, onRead }}
>
	<div class="h-full w-full will-change-transform" use:stackMotion>
		<ArticleContent {article} {onHide} />
	</div>
</div>
