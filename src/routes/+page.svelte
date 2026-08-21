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
	import { Button } from '#lib/ui/button/index.js';

	let articles = $state<StoredArticle[]>([]);
	let reelKey = $state(0);
	let hasSyncedEver = $state(true);
	let loading = $state(true);

	const visibleArticles = $derived(articles.filter((a) => !isMuted(a, settings)));

	let currentId = $state<string>();
	$effect(() => {
		if (currentId === undefined && visibleArticles.length > 0) currentId = visibleArticles[0].id;
	});
	$effect(() => {
		const id = currentId;
		if (!id || viewport.isDesktop) return;
		for (const el of document.querySelectorAll<HTMLElement>('[data-article-id]')) {
			if (el.dataset.articleId !== id) continue;
			el.scrollIntoView({ behavior: 'instant' });
			break;
		}
	});

	async function load() {
		articles = await unreadArticles();
		hasSyncedEver = (await syncedRunIds()).size > 0;
		loading = false;
	}

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

<div
	class="fixed top-[17vh] left-3 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border bg-(--press-glass) p-1 shadow-[0_18px_50px_color-mix(in_oklch,var(--foreground)_18%,transparent)] backdrop-blur-xl lg:top-4 lg:right-4 lg:left-auto lg:translate-y-0 lg:flex-row"
>
	<Button
		variant="ghost"
		size="icon"
		aria-label="Refresh editions"
		onclick={refresh}
		class="rounded-full"
	>
		<IconRefresh />
	</Button>
	<Button
		variant="ghost"
		size="icon"
		href="/list"
		aria-label="Open article ledger"
		class="relative rounded-full"
	>
		<IconList />
		{#if visibleArticles.length > 0}
			<!-- Desktop already shows the count in the sidebar header. -->
			<span
				class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[0.6rem] font-bold text-[var(--accent-foreground)] lg:hidden"
			>
				{visibleArticles.length}
			</span>
		{/if}
	</Button>
	<Button
		variant="ghost"
		size="icon"
		href="/settings"
		aria-label="Tune sources"
		class="rounded-full"
	>
		<IconSettings />
	</Button>
</div>

{#if loading}
	<div class="flex h-dvh w-full items-center justify-center p-6 text-center" role="status">
		<div class="press-card max-w-sm border bg-card p-8">
			<p class="mb-3 text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">
				Tuning in
			</p>
			<div
				class="mx-auto size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
				aria-hidden="true"
			></div>
			<p class="mt-4 text-sm leading-relaxed text-muted-foreground">Loading your edition…</p>
		</div>
	</div>
{:else if visibleArticles.length > 0}
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
	<div class="flex h-dvh w-full items-center justify-center p-6 text-center">
		<div class="press-card max-w-sm border bg-card p-8">
			<p class="mb-3 text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">
				Wire quiet
			</p>
			<p class="font-heading text-2xl leading-none font-black tracking-tight sm:text-3xl">
				Caught up.
			</p>
			<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
				Next edition drops at {nextRun.toLocaleTimeString(undefined, {
					hour: 'numeric',
					minute: '2-digit'
				})}. {formatCountdown(nextRun)}.
			</p>
		</div>
	</div>
{:else}
	<div class="flex h-dvh w-full items-center justify-center p-6 text-center">
		<div class="press-card max-w-sm border bg-card p-8">
			<p class="mb-3 text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">
				No cache
			</p>
			<p class="font-heading text-2xl leading-none font-black tracking-tight sm:text-3xl">
				No articles yet.
			</p>
			<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
				Connect to the internet to load today's first edition.
			</p>
		</div>
	</div>
{/if}
