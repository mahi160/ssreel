<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { sync } from '#lib/data/sync.js';
	import { unreadArticles, hideArticle, unhideArticle, type StoredArticle } from '#lib/data/db.js';
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

	async function handleHide(id: string) {
		articles = articles.filter((a) => a.id !== id);
		// Same toast id every time: a rapid second hide replaces this one instead of stacking.
		toast('Article hidden', {
			id: 'undo-hide',
			duration: 4000,
			action: { label: 'Undo', onClick: () => handleUndo(id) }
		});
		await hideArticle(id).catch((err) => console.error('hideArticle failed:', err));
	}

	async function handleUndo(id: string) {
		await unhideArticle(id).catch((err) => console.error('unhideArticle failed:', err));
		articles = await unreadArticles(); // re-sorts it back into its original position
	}
</script>

{#if articles.length > 0}
	<Reel
		{articles}
		onRead={(id) => (articles = articles.filter((a) => a.id !== id))}
		onHide={handleHide}
	/>
{:else}
	<div class="flex h-dvh w-full items-center justify-center p-4">
		<p class="text-muted-foreground">You're caught up.</p>
	</div>
{/if}
