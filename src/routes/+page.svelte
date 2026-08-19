<script lang="ts">
	import { sync } from '#lib/data/sync.js';
	import { allArticles, type StoredArticle } from '#lib/data/db.js';
	import * as Card from '@/ui/card/index.js';

	let newest = $state<StoredArticle | undefined>();

	async function load() {
		const articles = await allArticles();
		articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
		newest = articles[0];
	}

	$effect(() => {
		// Sync is best-effort: offline devices still read what they already have.
		sync()
			.catch(() => {})
			.finally(load);
	});
</script>

<div class="flex h-dvh w-full items-center justify-center p-4">
	{#if newest}
		<Card.Root class="h-full w-full max-w-md justify-center">
			<Card.Header>
				<Card.Title class="text-2xl">{newest.headline}</Card.Title>
				<Card.Description>{newest.source}</Card.Description>
			</Card.Header>
		</Card.Root>
	{:else}
		<p class="text-muted-foreground">Nothing here yet.</p>
	{/if}
</div>
