<script lang="ts">
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	import { Draggable } from 'gsap/Draggable';
	import { InertiaPlugin } from 'gsap/InertiaPlugin';
	import type { StoredArticle } from '#lib/data/db.js';
	import { markRead } from '#lib/data/db.js';
	import ArticleCard from './ArticleCard.svelte';
	import { cn } from '#lib/utils.js';

	gsap.registerPlugin(Draggable, InertiaPlugin);

	let {
		articles,
		onActive,
		onRead,
		onHide
	}: {
		articles: StoredArticle[];
		onActive?: (id: string) => void;
		onRead: (id: string) => void;
		onHide: (id: string) => void;
	} = $props();

	function read(id: string, dwellMs: number) {
		// A hide's synchronous removal from `articles` always lands before this
		// (async, DOM-removal-triggered) callback fires — if it's already gone,
		// the article was hidden mid-dwell, and hide should win over the read.
		if (!articles.some((a) => a.id === id)) return;
		onRead(id); // instant: the card is already scrolled past
		markRead(id, dwellMs).catch((err) => console.error('markRead failed:', err));
	}

	// Native scroll-snap is the accessibility/reduced-motion fallback
	// (ADR-0012) — GSAP's drag/inertia only takes over when motion is
	// actually wanted, so keyboard paging, VoiceOver swipe and a plain
	// respect-my-settings reader all keep working exactly as before.
	// ponytail: read once at mount, not a live media-query listener — unlike
	// viewport.svelte.ts's isDesktop, a user flipping this mid-session is
	// rare enough not to justify re-wiring an already-created Draggable.
	let reduceMotion = $state(true);
	let container = $state<HTMLDivElement>();

	onMount(() => {
		reduceMotion =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduceMotion || !container) return;

		const el = container;
		// A single function form applies directly to the drag's one axis (type:
		// 'scroll' here is vertical-only) — GSAP's own runtime also accepts a
		// { scrollTop } object for this, but its types don't declare that key.
		const [instance] = Draggable.create(el, {
			type: 'scroll',
			inertia: true,
			// Cards are 92dvh tall (the peek), so that's the snap increment too.
			snap: (value: number) => {
				const card = el.clientHeight * 0.92;
				return Math.round(value / card) * card;
			}
		});
		return () => instance.kill();
	});
</script>

<!-- overscroll-contain here, not on each card's inner text scroll below, so a
     swipe that runs past the end of a long article's body chains straight
     into paging to the next card instead of dead-ending; contain sits at
     this outer boundary only, to stop the browser's own bounce/refresh
     gesture at the very top/bottom of the whole reel. -->
<div
	bind:this={container}
	class={cn(
		'h-dvh w-full overflow-y-auto overscroll-contain',
		reduceMotion && 'snap-y snap-mandatory'
	)}
>
	{#each articles as article (article.id)}
		<ArticleCard
			{article}
			peek={!reduceMotion}
			onActive={() => onActive?.(article.id)}
			onRead={(dwellMs) => read(article.id, dwellMs)}
			onHide={() => onHide(article.id)}
		/>
	{/each}
</div>
