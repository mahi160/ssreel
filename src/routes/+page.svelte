<script lang="ts">
	import { sync } from '#lib/data/sync.js';
	import { unreadArticles, type StoredArticle } from '#lib/data/db.js';
	import Reel from '#lib/reel/Reel.svelte';

	let articles = $state<StoredArticle[]>([]);

	async function load() {
		articles = await unreadArticles();
	}

	$effect(() => {
		// Sync is best-effort: offline devices still read what they already have.
		sync()
			.catch(() => {})
			.finally(load);
	});
</script>

{#if articles.length > 0}
	<Reel {articles} onRead={(id) => (articles = articles.filter((a) => a.id !== id))} />
{:else}
	<div class="flex h-dvh w-full items-center justify-center p-4">
		<p class="text-muted-foreground">You're caught up.</p>
	</div>
{/if}
