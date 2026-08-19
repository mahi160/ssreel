<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { IconRefresh } from '@tabler/icons-svelte';
	import { sync } from '#lib/data/sync.js';
	import {
		unreadArticles,
		hideArticle,
		unhideArticle,
		byRunThenRank,
		type StoredArticle
	} from '#lib/data/db.js';
	import type { Run } from '#lib/data/schema.js';
	import { nextRunAt, formatCountdown } from '#lib/data/schedule.js';
	import Reel from '#lib/reel/Reel.svelte';
	import { Button } from '@/ui/button/index.js';

	let articles = $state<StoredArticle[]>([]);
	let reelKey = $state(0); // bumped to remount Reel, resetting scroll to the top article

	async function load() {
		articles = await unreadArticles();
	}

	// Adds a freshly-synced run's articles without re-deriving the whole list from
	// the device — a background backfill can land mid-session, after the reader
	// has already hidden or read something, and a full reload would race that
	// optimistic UI change against the DB write for it.
	function appendRun(run: Run) {
		// `known` also guards against a duplicate id within run.articles itself —
		// the collector dedupes this, but a keyed {#each} can't survive a repeat.
		// Plain Set: local to this call, never stored as component state.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const known = new Set(articles.map((a) => a.id));
		const additions: StoredArticle[] = [];
		for (const a of run.articles) {
			if (known.has(a.id)) continue;
			known.add(a.id);
			additions.push({ ...a, state: 'unread', stateChangedAt: run.generatedAt, dwellMs: 0 });
		}
		articles = [...articles, ...additions].sort(byRunThenRank);
	}

	$effect(() => {
		// Show whatever's already on the device first, then sync — best-effort, so
		// an offline device just keeps reading what it already has.
		load().then(() => sync(appendRun).catch(() => {}));
	});

	async function refresh() {
		reelKey++;
		try {
			await sync(appendRun);
		} catch {
			toast("You're offline — showing what's already on this device.");
		}
	}

	// Only the most recent hide needs to be undoable — a second hide replaces
	// the toast anyway (see the fixed toast id below), so one slot is enough,
	// and restoring from it needs no DB round-trip or full reload.
	let lastHidden: StoredArticle | undefined;

	async function handleHide(id: string) {
		lastHidden = articles.find((a) => a.id === id);
		articles = articles.filter((a) => a.id !== id);
		toast('Article hidden', {
			id: 'undo-hide',
			duration: 4000,
			action: { label: 'Undo', onClick: handleUndo }
		});
		await hideArticle(id).catch((err) => console.error('hideArticle failed:', err));
	}

	function handleUndo() {
		if (!lastHidden) return;
		articles = [...articles, { ...lastHidden, state: 'unread' as const }].sort(byRunThenRank);
		unhideArticle(lastHidden.id).catch((err) => console.error('unhideArticle failed:', err));
		lastHidden = undefined;
	}
</script>

<Button
	variant="ghost"
	size="icon"
	class="absolute top-4 right-4 z-10"
	aria-label="Refresh"
	onclick={refresh}
>
	<IconRefresh />
</Button>

{#if articles.length > 0}
	{#key reelKey}
		<Reel
			{articles}
			onRead={(id) => (articles = articles.filter((a) => a.id !== id))}
			onHide={handleHide}
		/>
	{/key}
{:else}
	{@const nextRun = nextRunAt()}
	<div class="flex h-dvh w-full flex-col items-center justify-center gap-1 p-4 text-center">
		<p class="text-lg">You're caught up.</p>
		<p class="text-muted-foreground">
			Next edition at {nextRun.toLocaleTimeString(undefined, {
				hour: 'numeric',
				minute: '2-digit'
			})} ({formatCountdown(nextRun)})
		</p>
	</div>
{/if}
