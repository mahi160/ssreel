<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { page } from '$app/state';
	import { IconList, IconRefresh, IconSettings } from '@tabler/icons-svelte';
	import { sync, pruneStale } from '#lib/data/sync.js';
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
	import type { Run, Section } from '#lib/data/schema.js';
	import { nextRunAt, formatCountdown } from '#lib/data/schedule.js';
	import Reel from '#lib/reel/Reel.svelte';
	import DesktopPane from '#lib/reel/DesktopPane.svelte';
	import SectionFilterChips from '#lib/reel/SectionFilterChips.svelte';
	import { viewport } from '#lib/reel/viewport.svelte.js';
	import { Button } from '#lib/ui/button/index.js';

	let articles = $state<StoredArticle[]>([]);
	let reelKey = $state(0);
	let hasSyncedEver = $state(true);
	let loading = $state(true);
	let showJumpPill = $state(false);
	// Gates appendRun's behaviour (ADR-0014): true once the initial load+sync
	// pass has produced the first newest run, so a later run landing mid-read
	// shows a pill instead of silently reordering the reel under the reader.
	let settled = false;
	// True once focusFromList has honoured a `?focus=` deep link, so a run
	// syncing in afterwards doesn't steal focus back to the newest article.
	let deepLinked = false;
	// Session-only reel filter, not Settings (CONTEXT.md — Mute is permanent):
	// resets to 'All' on every reload, never persisted.
	let sectionFilter = $state<Section | 'All'>('All');

	const visibleArticles = $derived(
		articles.filter(
			(a) => !isMuted(a, settings) && (sectionFilter === 'All' || a.section === sectionFilter)
		)
	);

	function selectSection(section: Section | 'All') {
		sectionFilter = section;
		currentId = visibleArticles[0]?.id;
		reelKey++; // fresh scroll position for the newly filtered set
	}

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
			deepLinked = true;
		} catch (err) {
			console.error('focusFromList failed:', err);
		}
	}

	// Adds a freshly-synced run's articles without re-deriving the whole list from
	// the device — a background backfill can land mid-session, after the reader
	// has already hidden or read something, and a full reload would race that
	// optimistic UI change against the DB write for it.
	//
	// Before `settled`, this is the initial load still finding its feet, so a
	// newer run always takes over as the current article. After `settled`, the
	// reader may already be mid-article; a newer run only raises the "jump to
	// latest" pill (ADR-0014) instead of moving anything under them.
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
		if (additions.length === 0) return;
		const isNewestRun = articles.length === 0 || run.id > articles[0].runId;
		articles = [...articles, ...additions].sort(byRunThenRank);
		hasSyncedEver = true; // a run just landed, so this is no longer "never synced"

		if (!settled) {
			if (!deepLinked && isNewestRun) currentId = articles[0].id;
		} else if (isNewestRun) {
			showJumpPill = true;
		}
	}

	/** Evicts what's aged out and snaps the reel to the newest article — the
	 * one moment (besides initial load) allowed to move the reel under the
	 * reader, because they asked for it (pill tap or the refresh button). */
	async function jumpToLatest() {
		showJumpPill = false;
		await pruneStale();
		articles = await unreadArticles();
		currentId = articles[0]?.id;
		reelKey++;
	}

	$effect(() => {
		// Show whatever's already on the device first, then sync — best-effort, so
		// an offline device just keeps reading what it already has. Safe to prune
		// here: nothing's been read yet this session.
		load()
			.then(focusFromList)
			.then(() => sync(appendRun))
			.catch(() => {})
			.finally(() => {
				settled = true;
			});
	});

	$effect(() => {
		// Reconnecting mid-session: fetch and store instantly, but never evict —
		// ADR-0014. A stray run this reveals just raises the jump-to-latest pill.
		function onOnline() {
			sync(appendRun, { prune: false }).catch(() => {});
		}
		window.addEventListener('online', onOnline);
		return () => window.removeEventListener('online', onOnline);
	});

	$effect(() => {
		// The app being reopened/foregrounded counts as "opening" it, not "reading"
		// it — so if a run arrived while it was backgrounded (pill already up, or
		// one turns up in this very check), resolve it automatically instead of
		// leaving the pill for the reader to notice.
		async function onVisible() {
			if (document.visibilityState !== 'visible') return;
			await sync(appendRun, { prune: false }).catch(() => {});
			if (showJumpPill) await jumpToLatest();
		}
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});

	async function refresh() {
		try {
			await sync(undefined, { prune: false });
		} catch {
			toast("You're offline — showing what's already on this device.");
			return;
		}
		await jumpToLatest();
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
	class="press-chip fixed bottom-4 left-3 z-20 flex flex-row items-center gap-1 rounded-full border bg-card p-1 lg:top-4 lg:right-4 lg:bottom-auto lg:left-auto"
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
				class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 font-mono text-[0.6rem] font-bold text-[var(--accent-foreground)] lg:hidden"
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

{#if showJumpPill}
	<div class="fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
		<Button onclick={jumpToLatest} class="press-chip">New edition — Jump to latest</Button>
	</div>
{/if}

{#if !loading}
	<div
		class="press-chip edge-fade-x fixed inset-x-3 top-3 z-20 flex [scrollbar-width:none] gap-1.5 overflow-x-auto rounded-full border bg-card p-1.5 lg:right-auto lg:left-1/2 lg:w-auto lg:-translate-x-1/2 [&::-webkit-scrollbar]:hidden"
	>
		<SectionFilterChips value={sectionFilter} onChange={selectSection} />
	</div>
{/if}

{#if loading}
	<div class="flex h-dvh w-full items-center justify-center p-6 text-center" role="status">
		<div class="press-card max-w-sm border bg-card p-8">
			<p class="text-eyebrow mb-3">Tuning in</p>
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
{:else if articles.length > 0}
	<!-- Unread articles exist — mute or the section filter just hides all of them
	     right now, so this isn't "caught up", the reader has just filtered too
	     narrowly. -->
	<div class="flex h-dvh w-full items-center justify-center p-6 text-center">
		<div class="press-card max-w-sm border bg-card p-8">
			<p class="text-eyebrow mb-3">Filtered out</p>
			<p class="font-heading text-2xl leading-none font-black tracking-tight sm:text-3xl">
				Nothing here.
			</p>
			<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
				No unread articles match this filter right now.
			</p>
			{#if sectionFilter !== 'All'}
				<Button class="mt-5" size="sm" onclick={() => selectSection('All')}
					>Show all sections</Button
				>
			{/if}
		</div>
	</div>
{:else if hasSyncedEver}
	{@const nextRun = nextRunAt()}
	<div class="flex h-dvh w-full items-center justify-center p-6 text-center">
		<div class="press-card max-w-sm border bg-card p-8">
			<p class="text-eyebrow mb-3">Wire quiet</p>
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
			<p class="text-eyebrow mb-3">No cache</p>
			<p class="font-heading text-2xl leading-none font-black tracking-tight sm:text-3xl">
				No articles yet.
			</p>
			<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
				Connect to the internet to load today's first edition.
			</p>
		</div>
	</div>
{/if}
