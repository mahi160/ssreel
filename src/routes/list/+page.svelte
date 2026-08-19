<script lang="ts">
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { allArticles, unhideArticle, type ReadState, type StoredArticle } from '#lib/data/db.js';
	import { Button } from '@/ui/button/index.js';
	import * as Tabs from '@/ui/tabs/index.js';
	import { cn } from '@/utils.js';

	let articles = $state<StoredArticle[]>([]);
	let filter = $state<'all' | ReadState>('all');

	async function load() {
		articles = await allArticles();
	}
	load();

	const filtered = $derived(
		articles
			.filter((a) => filter === 'all' || a.state === filter)
			.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
	);

	async function restore(id: string) {
		const article = articles.find((a) => a.id === id);
		if (article) article.state = 'unread';
		await unhideArticle(id).catch((err) => console.error('unhideArticle failed:', err));
	}
</script>

<div class="mx-auto flex h-dvh max-w-2xl flex-col p-4">
	<div class="mb-4 flex items-center gap-2">
		<Button variant="ghost" size="icon" href="/" aria-label="Back to reel">
			<IconArrowLeft />
		</Button>
		<h1 class="text-lg font-semibold">List</h1>
	</div>

	<Tabs.Root bind:value={filter}>
		<Tabs.List>
			<Tabs.Trigger value="all">All</Tabs.Trigger>
			<Tabs.Trigger value="unread">Unread</Tabs.Trigger>
			<Tabs.Trigger value="read">Read</Tabs.Trigger>
			<Tabs.Trigger value="hidden">Hidden</Tabs.Trigger>
		</Tabs.List>
	</Tabs.Root>

	<ul class="mt-2 flex-1 divide-y divide-border overflow-y-auto">
		{#each filtered as article (article.id)}
			<li>
				{#if article.state === 'hidden'}
					<div class="flex items-center justify-between gap-2 py-3">
						<div class="min-w-0">
							<p class="truncate text-muted-foreground">{article.headline}</p>
							<p class="text-xs text-muted-foreground">
								{article.source} · {article.section} · {new Date(
									article.publishedAt
								).toLocaleString(undefined, {
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit'
								})}
							</p>
						</div>
						<Button variant="outline" size="sm" onclick={() => restore(article.id)}>Restore</Button>
					</div>
				{:else}
					<a
						href="/?focus={article.id}"
						class="block py-3 focus-visible:outline focus-visible:outline-ring"
					>
						<p class={cn('truncate', article.state === 'read' && 'text-muted-foreground')}>
							{article.headline}
						</p>
						<p class="text-xs text-muted-foreground">
							{article.source} · {article.section} · {new Date(article.publishedAt).toLocaleString(
								undefined,
								{ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
							)}
						</p>
					</a>
				{/if}
			</li>
		{:else}
			<li class="py-8 text-center text-muted-foreground">Nothing here.</li>
		{/each}
	</ul>
</div>
