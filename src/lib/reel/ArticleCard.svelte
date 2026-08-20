<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { dwellTracker } from './dwell.js';
	import { cardGestures } from './gestures.js';
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

	let expanded = $state(false);
</script>

<div
	class="flex h-dvh w-full snap-start snap-always items-center justify-center px-4 pt-4 pb-24 sm:p-6 lg:p-8"
	data-article-id={article.id}
	use:dwellTracker={{ onActive, onRead }}
	use:cardGestures={{ onTap: () => (expanded = !expanded), onHide }}
>
	<ArticleContent {article} {expanded} onToggleExpand={() => (expanded = !expanded)} {onHide} />
</div>
