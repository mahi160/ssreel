<script lang="ts">
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { allArticles, clearAllArticles } from '#lib/data/db.js';
	import { SECTIONS } from '#lib/data/schema.js';
	import {
		settings,
		toggleMutedSection,
		toggleMutedSource,
		setDwellMs
	} from '#lib/data/settings.svelte.js';
	import { Button } from '@/ui/button/index.js';
	import { Switch } from '@/ui/switch/index.js';
	import { Label } from '@/ui/label/index.js';
	import { Input } from '@/ui/input/index.js';

	let sources = $state<string[]>([]);
	let articleCount = $state(0);
	let storageBytes = $state<number | undefined>();

	// Guards against an in-flight load overwriting the result of a later one
	// (e.g. the initial load resolving after a Clear has already refreshed it).
	let loadGeneration = 0;

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
		loadStorageInfo(); // IndexedDB only exists in the browser — must not run during SSR
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

<div class="mx-auto flex h-dvh max-w-2xl flex-col gap-8 overflow-y-auto p-4">
	<div class="flex items-center gap-2">
		<Button variant="ghost" size="icon" href="/" aria-label="Back to reel">
			<IconArrowLeft />
		</Button>
		<h1 class="text-lg font-semibold">Settings</h1>
	</div>

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-semibold text-muted-foreground">Sections</h2>
		{#each SECTIONS as section (section)}
			<div class="flex items-center justify-between gap-4">
				<Label for="section-{section}">{section}</Label>
				<Switch
					id="section-{section}"
					checked={!settings.mutedSections.includes(section)}
					onCheckedChange={() => toggleMutedSection(section)}
				/>
			</div>
		{/each}
	</section>

	{#if sources.length > 0}
		<section class="flex flex-col gap-3">
			<h2 class="text-sm font-semibold text-muted-foreground">Sources</h2>
			{#each sources as source (source)}
				<div class="flex items-center justify-between gap-4">
					<Label for="source-{source}">{source}</Label>
					<Switch
						id="source-{source}"
						checked={!settings.mutedSources.includes(source)}
						onCheckedChange={() => toggleMutedSource(source)}
					/>
				</div>
			{/each}
		</section>
	{/if}

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-semibold text-muted-foreground">Reading</h2>
		<div class="flex items-center justify-between gap-4">
			<Label for="dwell">Dwell threshold (seconds)</Label>
			<Input
				id="dwell"
				type="number"
				min="1"
				class="w-20"
				value={settings.dwellMs / 1000}
				onchange={(e) => setDwellMs(e.currentTarget.valueAsNumber * 1000)}
			/>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h2 class="text-sm font-semibold text-muted-foreground">Storage</h2>
		<p class="text-sm text-muted-foreground">
			{articleCount} article{articleCount === 1 ? '' : 's'} stored{storageBytes !== undefined
				? ` · ${formatBytes(storageBytes)} used`
				: ''}
		</p>
		<Button variant="destructive" class="self-start" onclick={clearStorage}>
			Clear stored articles
		</Button>
	</section>
</div>
