<script lang="ts">
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { allArticles, clearAllArticles } from '#lib/data/db.js';
	import {
		LANGUAGE_LABEL,
		SECTIONS,
		SECTION_ACCENT,
		type LanguageFilter
	} from '#lib/data/schema.js';
	import {
		settings,
		toggleMutedSection,
		toggleMutedSource,
		setDwellMs,
		setDarkMode,
		setLanguageFilter,
		type DarkMode
	} from '#lib/data/settings.svelte.js';
	import { Button } from '#lib/ui/button/index.js';
	import { Switch } from '#lib/ui/switch/index.js';
	import { Label } from '#lib/ui/label/index.js';
	import { Input } from '#lib/ui/input/index.js';

	let sources = $state<string[]>([]);
	let articleCount = $state(0);
	let storageBytes = $state<number | undefined>();
	let loadGeneration = 0;
	const darkModes: DarkMode[] = ['system', 'light', 'dark'];
	const languageFilters: LanguageFilter[] = ['mixed', 'en', 'bn'];

	async function loadStorageInfo() {
		const generation = ++loadGeneration;
		const articles = await allArticles();
		const usage = (await navigator.storage?.estimate?.())?.usage;
		if (generation !== loadGeneration) return;
		articleCount = articles.length;
		sources = [...new Set(articles.map((a) => a.source))].sort();
		storageBytes = usage;
	}
	$effect(() => {
		void loadStorageInfo();
	});

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function clearStorage() {
		if (!confirm('Clear every stored article? This cannot be undone.')) return;
		await clearAllArticles();
		await loadStorageInfo();
	}
</script>

<div
	class="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-4 overflow-y-auto p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-8 sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top))]"
>
	<header class="press-card border bg-card p-4 sm:p-5">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">
					Desk controls
				</p>
				<h1
					class="mt-2 font-heading text-3xl leading-none font-black tracking-[-0.04em] sm:text-4xl"
				>
					Tune feed
				</h1>
			</div>
			<Button variant="ghost" size="icon" href="/" aria-label="Back to reel" class="rounded-full">
				<IconArrowLeft />
			</Button>
		</div>
	</header>

	<div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
		<section class="rounded-3xl border bg-[var(--press-glass)] p-4 backdrop-blur-xl sm:p-5">
			<div class="mb-4 flex items-end justify-between gap-4 border-b pb-4">
				<div>
					<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">
						Sections
					</p>
					<h2 class="font-heading text-xl leading-none font-black tracking-[-0.02em]">
						Keep on desk
					</h2>
				</div>
			</div>
			<div class="grid gap-2">
				{#each SECTIONS as section (section)}
					<div
						style={`--accent:${SECTION_ACCENT[section]}`}
						class="grid grid-cols-[0.75rem_1fr_auto] items-center gap-3 rounded-2xl border bg-card/75 p-3"
					>
						<span class="h-full min-h-9 rounded-full bg-[var(--accent)]" aria-hidden="true"></span>
						<Label for="section-{section}" class="tracking-normal normal-case">
							<span>{section}</span>
						</Label>
						<Switch
							id="section-{section}"
							checked={!settings.mutedSections.includes(section)}
							onCheckedChange={() => toggleMutedSection(section)}
						/>
					</div>
				{/each}
			</div>
		</section>

		<section class="rounded-3xl border bg-[var(--press-glass)] p-4 backdrop-blur-xl sm:p-5">
			<div class="mb-4 border-b pb-4">
				<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">Reading</p>
				<h2 class="font-heading text-xl leading-none font-black tracking-[-0.02em]">Pass speed</h2>
			</div>

			<div class="grid gap-3 rounded-2xl border bg-card/75 p-4">
				<p class="text-xs font-bold tracking-[0.24em] text-muted-foreground uppercase">Theme</p>
				<div class="flex flex-wrap gap-2">
					{#each darkModes as mode (mode)}
						<Button
							size="sm"
							variant={settings.darkMode === mode ? 'default' : 'outline'}
							onclick={() => setDarkMode(mode)}
						>
							{mode}
						</Button>
					{/each}
				</div>
			</div>

			<div class="mt-4 grid gap-3 rounded-2xl border bg-card/75 p-4">
				<p class="text-xs font-bold tracking-[0.24em] text-muted-foreground uppercase">Language</p>
				<div class="flex flex-wrap gap-2">
					{#each languageFilters as languageFilter (languageFilter)}
						<Button
							size="sm"
							variant={settings.languageFilter === languageFilter ? 'default' : 'outline'}
							onclick={() => setLanguageFilter(languageFilter)}
						>
							{LANGUAGE_LABEL[languageFilter]}
						</Button>
					{/each}
				</div>
			</div>

			<div class="mt-4 grid gap-4 rounded-2xl border bg-card/75 p-4">
				<div class="flex items-center justify-between gap-4">
					<Label for="dwell" class="tracking-normal normal-case"
						>Seconds before article is read</Label
					>
					<Input
						id="dwell"
						type="number"
						min="1"
						class="w-20 text-center"
						value={settings.dwellMs / 1000}
						onchange={(e) => setDwellMs(e.currentTarget.valueAsNumber * 1000)}
					/>
				</div>
				<p class="text-sm leading-relaxed text-muted-foreground">
					Fast skim? Lower it. Deep read? Raise it. Swipe still hides instantly.
				</p>
			</div>

			<div class="mt-4 rounded-2xl border bg-card/75 p-4">
				<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">Storage</p>
				<p class="mt-2 text-sm text-muted-foreground">
					{articleCount} article{articleCount === 1 ? '' : 's'} stored{storageBytes !== undefined
						? ` · ${formatBytes(storageBytes)} used`
						: ''}
				</p>
				<Button variant="destructive" class="mt-4" onclick={clearStorage}
					>Clear stored articles</Button
				>
			</div>
		</section>
	</div>

	{#if sources.length > 0}
		<section class="rounded-3xl border bg-[var(--press-glass)] p-4 backdrop-blur-xl sm:p-5">
			<div class="mb-4 border-b pb-4">
				<p class="text-xs font-bold tracking-[0.32em] text-muted-foreground uppercase">Sources</p>
				<h2 class="font-heading text-xl leading-none font-black tracking-[-0.02em]">
					Open channels
				</h2>
			</div>
			<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
				{#each sources as source (source)}
					<div class="flex items-center justify-between gap-4 rounded-2xl border bg-card/75 p-3">
						<Label for="source-{source}" class="truncate tracking-normal normal-case"
							>{source}</Label
						>
						<Switch
							id="source-{source}"
							checked={!settings.mutedSources.includes(source)}
							onCheckedChange={() => toggleMutedSource(source)}
						/>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
