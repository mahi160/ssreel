<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { IconList, IconRefresh, IconSettings } from '@tabler/icons-svelte';
	import { sync } from '#lib/data/sync.js';
	import { isMuted } from '#lib/data/mute.js';
	import { settings } from '#lib/data/settings.svelte.js';
	import {
		unreadArticles,
		syncedRunIds,
		getArticle,
		hideArticle,
		unhideArticle,
		byRunThenRank,
		type StoredArticle
	} from '#lib/data/db.js';
	import type { Run } from '#lib/data/schema.js';
	import { nextRunAt, formatCountdown } from '#lib/data/schedule.js';
	import Reel from '#lib/reel/Reel.svelte';
	import DesktopPane from '#lib/reel/DesktopPane.svelte';
	import { viewport } from '#lib/reel/viewport.svelte.js';
	import { Button } from '@/ui/button/index.js';

	let articles = $state<StoredArticle[]>([]);
	let reelKey = $state(0); // bumped to remount Reel, resetting scroll to the top article
	// Distinguishes a genuine "caught up" (has synced before, nothing left
	// unread) from a fresh install that's never reached the network — the
	// latter needs an explanation, not a countdown to an edition it can't
	// promise exists.
	let hasSyncedEver = $state(true);

	// Muting is display-only: `articles` always holds every unread article on
	// the device, so unmuting reveals matches instantly with no reload or refetch.
	const visibleArticles = $derived(articles.filter((a) => !isMuted(a, settings)));

	// The article currently being read, shared between the mobile reel and the
	// desktop pane so resizing across the breakpoint never loses the reader's
	// place — both layouts stay mounted (toggled with CSS, see the markup
	// below), and this is their one shared source of truth.
	let currentId = $state<string>();
	$effect(() => {
		if (currentId === undefined && visibleArticles.length > 0) currentId = visibleArticles[0].id;
	});
	// Keeps the mobile reel scrolled to whatever the desktop pane selected, so
	// switching back to it lands on the same article. Gated on !isDesktop:
	// scrollIntoView is a no-op on a display:none element, so this has to wait
	// until the reel actually becomes visible again, not just fire whenever
	// currentId changes (which can happen while the reel is still hidden).
	$effect(() => {
		const id = currentId;
		if (!id || viewport.isDesktop) return;
		document.querySelector(`[data-article-id="${id}"]`)?.scrollIntoView({ behavior: 'instant' });
	});

	async function load() {
		articles = await unreadArticles();
		hasSyncedEver = (await syncedRunIds()).size > 0;
	}

	// The list can send the reader to a specific article — including a read or
	// hidden one the reel wouldn't otherwise show — via ?focus=<id>.
	async function focusFromList() {
		const id = page.url.searchParams.get('focus');
		if (!id) return;
		try {
			if (!articles.some((a) => a.id === id)) {
				const article = await getArticle(id);
				if (article) articles = [...articles, article].sort(byRunThenRank);
			}
			currentId = id; // triggers the scroll-into-view effect below, once the DOM has the card
		} catch (err) {
			console.error('focusFromList failed:', err);
		}
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
		hasSyncedEver = true; // a run just landed, so this is no longer "never synced"
	}

	$effect(() => {
		// Show whatever's already on the device first, then sync — best-effort, so
		// an offline device just keeps reading what it already has.
		load()
			.then(focusFromList)
			.then(() => sync(appendRun).catch(() => {}));
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

<div class="absolute top-4 right-4 z-10 flex gap-2">
	<Button variant="ghost" size="icon" aria-label="Refresh" onclick={refresh}>
		<IconRefresh />
	</Button>
	<Button variant="ghost" size="icon" href="/list" aria-label="List">
		<IconList />
	</Button>
	<Button variant="ghost" size="icon" href="/settings" aria-label="Settings">
		<IconSettings />
	</Button>
</div>

{#if visibleArticles.length > 0}
	<div class="lg:hidden">
		{#key reelKey}
			<Reel
				articles={visibleArticles}
				onActive={(id) => (currentId = id)}
				onRead={(id) => (articles = articles.filter((a) => a.id !== id))}
				onHide={handleHide}
			/>
		{/key}
	</div>
	<DesktopPane
		articles={visibleArticles}
		{currentId}
		onSelect={(id) => (currentId = id)}
		onRead={(id) => (articles = articles.filter((a) => a.id !== id))}
		onHide={handleHide}
	/>
{:else if hasSyncedEver}
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
{:else}
	<div class="flex h-dvh w-full flex-col items-center justify-center gap-1 p-4 text-center">
		<p class="text-lg">No articles yet.</p>
		<p class="text-muted-foreground">Connect to the internet to get today's edition.</p>
	</div>
{/if}
