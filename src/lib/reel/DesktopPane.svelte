<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { markRead } from '#lib/data/db.js';
	import { settings } from '#lib/data/settings.svelte.js';
	import { viewport } from './viewport.svelte.js';
	import ArticleContent from './ArticleContent.svelte';
	import { cn } from '@/utils.js';

	let {
		articles,
		currentId,
		onSelect,
		onRead,
		onHide
	}: {
		articles: StoredArticle[];
		currentId: string | undefined;
		onSelect: (id: string) => void;
		onRead: (id: string) => void;
		onHide: (id: string) => void;
	} = $props();

	// Looked up by id, not index: articles can reorder as backfill lands, and an
	// index would silently point at the wrong article after that.
	const selected = $derived(articles.find((a) => a.id === currentId) ?? articles[0]);
	let expanded = $state(false);

	// Dwell here is simpler than the reel's IntersectionObserver: there's only
	// ever one candidate (the selection), so its lifetime IS the dwell window.
	// Gated on `viewport.isDesktop`: this effect reruns on `selected` even while
	// the mobile reel is the one showing (both layouts stay mounted so resizing
	// never loses the reader's place) — without the gate it would double-count
	// dwell time the reel is already tracking on its own.
	$effect(() => {
		const article = selected;
		if (!article || !viewport.isDesktop) return;
		const enteredAt = performance.now();
		return () => {
			const dwellMs = performance.now() - enteredAt;
			if (dwellMs < settings.dwellMs) return;
			// Mirrors the reel's guard: a hide that already removed this article
			// from `articles` wins over a dwell-completion racing it.
			if (!articles.some((a) => a.id === article.id)) return;
			onRead(article.id);
			markRead(article.id, dwellMs).catch((err) => console.error('markRead failed:', err));
		};
	});

	function move(delta: number) {
		if (!selected || articles.length === 0) return;
		const index = articles.findIndex((a) => a.id === selected.id);
		const next = Math.min(articles.length - 1, Math.max(0, index + delta));
		onSelect(articles[next].id);
		expanded = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			move(1);
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			move(-1);
			e.preventDefault();
		} else if (e.key === 'Enter' || e.key === ' ') {
			expanded = !expanded;
			e.preventDefault();
		} else if ((e.key === 'Backspace' || e.key === 'Delete') && selected) {
			onHide(selected.id);
			e.preventDefault();
		}
	}

	let container = $state<HTMLUListElement>();
	$effect(() => {
		if (viewport.isDesktop) container?.focus();
	});
</script>

<div class="hidden h-dvh w-full lg:flex">
	<ul
		bind:this={container}
		tabindex="0"
		role="listbox"
		aria-label="Articles: up/down to select, enter to expand, backspace to hide"
		onkeydown={onKeydown}
		class="w-80 shrink-0 divide-y divide-border overflow-y-auto border-r border-border focus-visible:outline focus-visible:outline-ring"
	>
		{#each articles as article (article.id)}
			<li role="presentation">
				<button
					type="button"
					role="option"
					aria-selected={article.id === selected?.id}
					class={cn(
						'block w-full truncate p-3 text-left focus-visible:outline focus-visible:outline-ring',
						article.id === selected?.id && 'bg-muted'
					)}
					onclick={() => {
						onSelect(article.id);
						expanded = false;
					}}
				>
					{article.headline}
				</button>
			</li>
		{/each}
	</ul>
	<div class="flex flex-1 items-center justify-center p-4">
		{#if selected}
			<ArticleContent article={selected} {expanded} />
		{/if}
	</div>
</div>
