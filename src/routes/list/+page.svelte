<script lang="ts">
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { allArticles, unhideArticle, type ReadState, type StoredArticle } from '#lib/data/db.js';
	import { isMuted } from '#lib/data/mute.js';
	import { settings } from '#lib/data/settings.svelte.js';
	import { LANGUAGE_LABEL, SECTION_ACCENT, articleLanguage } from '#lib/data/schema.js';
	import { Button } from '#lib/ui/button/index.js';
	import * as Tabs from '#lib/ui/tabs/index.js';
	import { cn } from '#lib/utils.js';

	let articles = $state<StoredArticle[]>([]);
	let filter = $state<'all' | ReadState>('all');

	async function load() {
		articles = await allArticles();
	}
	$effect(() => {
		void load();
	});

	const filtered = $derived(
		articles
			.filter((a) => !isMuted(a, settings))
			.filter((a) => filter === 'all' || a.state === filter)
			.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
	);

	function stamp(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function restore(id: string) {
		try {
			await unhideArticle(id);
			const article = articles.find((a) => a.id === id);
			if (article) article.state = 'unread';
		} catch (err) {
			console.error('unhideArticle failed:', err);
		}
	}
</script>

<div
	class="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-4 overflow-hidden p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6 sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top))]"
>
	<header class="press-card border bg-card p-4 sm:p-5">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">
					Article ledger
				</p>
				<h1
					class="mt-2 font-heading text-3xl leading-none font-black tracking-[-0.04em] sm:text-4xl"
				>
					Clips
				</h1>
			</div>
			<Button variant="ghost" size="icon" href="/" aria-label="Back to reel" class="rounded-full">
				<IconArrowLeft />
			</Button>
		</div>
	</header>

	<Tabs.Root
		bind:value={filter}
		class="min-h-0 flex-1 overflow-hidden rounded-3xl border bg-[var(--press-glass)] p-2 backdrop-blur-xl"
	>
		<Tabs.List
			variant="line"
			class="sticky top-0 z-10 mb-2 w-full justify-start overflow-x-auto bg-transparent p-2"
		>
			<Tabs.Trigger value="all">All</Tabs.Trigger>
			<Tabs.Trigger value="unread">Unread</Tabs.Trigger>
			<Tabs.Trigger value="read">Read</Tabs.Trigger>
			<Tabs.Trigger value="hidden">Hidden</Tabs.Trigger>
		</Tabs.List>

		<ul
			class="h-[calc(100%-3.75rem)] overflow-y-auto p-2 sm:grid sm:auto-rows-min sm:grid-cols-2 sm:gap-3"
		>
			{#each filtered as article (article.id)}
				<li style={`--accent:${SECTION_ACCENT[article.section]}`}>
					{#if article.state === 'hidden'}
						<div
							class="mb-3 grid grid-cols-[0.6rem_1fr_auto] gap-3 rounded-2xl border bg-card/70 p-3 opacity-75"
						>
							<span class="rounded-full bg-[var(--accent)]" aria-hidden="true"></span>
							<div class="min-w-0">
								<p class="truncate font-semibold text-muted-foreground">{article.headline}</p>
								<p
									class="mt-1 text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
								>
									<span class="block truncate"
										>{article.source} · {article.section} · {LANGUAGE_LABEL[
											articleLanguage(article)
										]}</span
									>
									<span class="block text-foreground/70">{stamp(article.publishedAt)}</span>
								</p>
							</div>
							<Button variant="outline" size="sm" onclick={() => restore(article.id)}
								>Restore</Button
							>
						</div>
					{:else}
						<a
							href="/?focus={article.id}"
							class="mb-3 grid grid-cols-[0.6rem_1fr] gap-3 rounded-2xl border bg-card/80 p-3 transition hover:translate-x-1 hover:shadow-[0.35rem_0.35rem_0_var(--accent)] focus-visible:outline focus-visible:outline-ring"
						>
							<span class="rounded-full bg-[var(--accent)]" aria-hidden="true"></span>
							<span class="min-w-0">
								<span
									class={cn(
										'block truncate font-semibold',
										article.state === 'read' && 'text-muted-foreground'
									)}
								>
									{article.headline}
								</span>
								<span
									class="mt-1 block text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase"
								>
									<span class="block truncate">
										{article.source} · <span class="text-[var(--accent)]">{article.section}</span> · {LANGUAGE_LABEL[
											articleLanguage(article)
										]}
									</span>
									<span class="block text-foreground/70">{stamp(article.publishedAt)}</span>
								</span>
							</span>
						</a>
					{/if}
				</li>
			{:else}
				<li
					class="rounded-2xl border border-dashed p-8 text-center text-muted-foreground sm:col-span-2"
				>
					Nothing here. Change filters or unmute a source.
				</li>
			{/each}
		</ul>
	</Tabs.Root>
</div>
