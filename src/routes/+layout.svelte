<script lang="ts">
	import './layout.css';
	import { MediaQuery } from 'svelte/reactivity';
	import favicon from '#lib/assets/favicon.svg';
	import { settings } from '#lib/data/settings.svelte.js';
	import { Toaster } from '#lib/ui/sonner/index.js';

	let { children } = $props();

	// Resolves 'system' against the OS preference so the <html> class always
	// matches what's actually shown, without a second reactive store fighting
	// our own settings for ownership of "which mode is current".
	const systemDark = new MediaQuery('(prefers-color-scheme: dark)');
	const isDark = $derived(
		settings.darkMode === 'dark' || (settings.darkMode === 'system' && systemDark.current)
	);

	$effect(() => {
		document.documentElement.classList.toggle('dark', isDark);
		// The two prefers-color-scheme theme-color tags in app.html only cover
		// the OS preference; the reader can override dark mode independently of
		// it (settings.darkMode), so Android's status bar/chrome tint has to be
		// pushed to match what's actually on screen once we know that.
		const color = isDark ? '#05131c' : '#eaf4f9';
		for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
			meta.setAttribute('content', color);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
<Toaster />
