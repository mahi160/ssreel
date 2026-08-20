<script lang="ts">
	import type { StoredArticle } from '#lib/data/db.js';
	import { markRead } from '#lib/data/db.js';
	import { SECTION_ACCENT } from '#lib/data/schema.js';
	import { settings } from '#lib/data/settings.svelte.js';
	import { viewport } from './viewport.svelte.js';
	import ArticleContent from './ArticleContent.svelte';
	import { cn } from '#lib/utils.js';

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

	const selected = $derived(articles.find((a) => a.id === currentId) ?? articles[0]);
	let expanded = $state(false);

	$effect(() => {
		const article = selected;
		if (!article || !viewport.isDesktop) return;
		const enteredAt = performance.now();
		return () => {
			const dwellMs = performance.now() - enteredAt;
			if (dwellMs < settings.dwellMs) return;
			if (!articles.some((a) => a.id === article.id)) return;
			onRead(article.id);
			markRead(article.id, dwellMs).catch((err) => console.error('markRead failed:', err));
		};
	});

	function move(delta: number) {
		if (!selected || articles.length === 0) return;
		const index = articles.findIndex((a) => a.id === selected.id);
		if (index === -1) return;
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

<div class="hidden h-dvh w-full grid-cols-[22rem_1fr] gap-8 overflow-hidden p-6 lg:grid">
	<aside
		class="flex min-h-0 flex-col rounded-3xl border bg-[var(--press-glass)] shadow-[0_24px_80px_color-mix(in_oklch,var(--foreground)_14%,transparent)] backdrop-blur-xl"
	>
		<div class="border-b p-5">
			<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">Wire stack</p>
			<p class="mt-2 font-heading text-3xl leading-none font-black tracking-[-0.04em]">
				{articles.length} unread
			</p>
		</div>
		<ul
			bind:this={container}
			tabindex="0"
			role="listbox"
			aria-label="Articles: up/down to select, enter to expand, backspace to hide"
			onkeydown={onKeydown}
			class="min-h-0 flex-1 overflow-y-auto p-2 focus-visible:outline focus-visible:outline-ring"
		>
			{#each articles as article (article.id)}
				<li role="presentation" style={`--accent:${SECTION_ACCENT[article.section]}`}>
					<button
						type="button"
						role="option"
						aria-selected={article.id === selected?.id}
						class={cn(
							'group relative mb-2 grid w-full grid-cols-[0.55rem_1fr] gap-3 rounded-2xl border border-transparent p-3 text-left transition focus-visible:outline focus-visible:outline-ring',
							article.id === selected?.id
								? 'border-foreground/20 bg-card shadow-[0.35rem_0.35rem_0_var(--accent)]'
								: 'hover:border-foreground/10 hover:bg-card/65'
						)}
						onclick={() => {
							onSelect(article.id);
							expanded = false;
						}}
					>
						<span class="mt-1 h-full min-h-10 rounded-full bg-[var(--accent)]" aria-hidden="true"
						></span>
						<span class="min-w-0">
							<span class="block truncate text-sm font-semibold">{article.headline}</span>
							<span
								class="mt-1 block truncate text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
							>
								{article.section} · {article.source}
							</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</aside>

	<main class="flex min-h-0 items-center justify-center pb-16">
		{#if selected}
			<ArticleContent article={selected} {expanded} />
		{/if}
	</main>
</div>
