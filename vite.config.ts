import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// The service worker names its app-shell cache after this so a new deploy
	// never serves a stale shell (ADR-0009) — not $app/env's `version`, which
	// doesn't resolve in the serviceWorker build target on this SvelteKit
	// version.
	define: { __BUILD_ID__: JSON.stringify(String(Date.now())) },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
				experimental: { async: true }
			},
			adapter: adapter(),
			alias: {
				'@/*': './src/lib/*'
			},
			experimental: { remoteFunctions: true }
		})
	]
});
