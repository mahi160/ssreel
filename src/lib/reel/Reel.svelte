<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { markRead } from '#lib/data/db.js';
	import { dwellTracker } from './dwell.js';
	import * as Card from '@/ui/card/index.js';

	let { articles, onRead }: { articles: StoredArticle[]; onRead: (id: string) => void } = $props();

	function read(id: string, dwellMs: number) {
		onRead(id); // instant: the card is already scrolled past
		markRead(id, dwellMs).catch((err) => console.error('markRead failed:', err));
	}
</script>

<div class="h-dvh w-full snap-y snap-mandatory overflow-y-auto">
	{#each articles as article (article.id)}
		<div
			class="flex h-dvh w-full snap-start snap-always items-center justify-center p-4"
			use:dwellTracker={(dwellMs) => read(article.id, dwellMs)}
		>
			<Card.Root class="h-full w-full max-w-md justify-center overflow-y-auto">
				<Card.Header>
					<Card.Description>{article.source} · {article.section}</Card.Description>
					<Card.Title class="text-2xl">{article.headline}</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-muted-foreground">{article.excerpt}</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/each}
</div>
