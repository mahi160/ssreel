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

<div
	class="h-dvh w-full snap-start snap-always"
	data-article-id={article.id}
	use:dwellTracker={{ onActive, onRead }}
>
	<ArticleContent {article} {onHide} />
</div>
