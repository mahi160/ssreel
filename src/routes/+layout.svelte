<script lang="ts">
	import './layout.css';
	import { MediaQuery } from 'svelte/reactivity';
	import favicon from '#lib/assets/favicon.svg';
	import { settings } from '#lib/data/settings.svelte.js';
	import { Toaster } from '@/ui/sonner/index.js';

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
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
<Toaster />
