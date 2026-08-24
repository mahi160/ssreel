// Runs in a ServiceWorkerGlobalScope, not the DOM scope the rest of src/
// assumes — excluded from tsconfig.json's typecheck for that reason, and
// covered by manual/browser testing instead of fighting the lib mismatch.
//
// Cache strategy follows mutability (ADR-0009):
//  - the app shell is cached on first use and versioned per build
//  - /data/index.json is network-first, so a reader online always learns
//    about new runs
//  - run files and images are immutable: cache-first, never revalidated
import { IMMUTABLE_CACHE, DATA_CACHE } from '#lib/data/cacheNames.js';

// ponytail: `vite dev` never runs the build's define-substitution for this
// file (only `vite build`'s dedicated serviceWorker step does), so the
// global is missing in dev — fall back to a fixed dev cache name instead of
// crashing the SW's evaluation.
declare const __BUILD_ID__: string | undefined;
const isDev = typeof __BUILD_ID__ === 'undefined';
const SHELL_CACHE = `ssreel-shell-${isDev ? 'dev' : __BUILD_ID__}`;

self.addEventListener('install', (event) => {
	// Dev's module URLs aren't content-hashed per build like prod's are, so
	// there's no per-build cache-busting here — cache-first would serve the
	// same stale JS/CSS for the entire life of the dev cache. skipWaiting still
	// runs, so an updated worker still replaces whatever stale one is already
	// controlling the page.
	if (isDev) {
		event.waitUntil(self.skipWaiting());
		return;
	}
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.add('/'))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key.startsWith('ssreel-shell-') && key !== SHELL_CACHE)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => self.clients.claim())
	);
});

async function networkFirst(request, cacheName) {
	try {
		const response = await fetch(request);
		if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
		return response;
	} catch (err) {
		const cached = await caches.match(request);
		if (cached) return cached;
		throw err;
	}
}

async function cacheFirst(request, cacheName) {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
	return response;
}

// Only '/' is precached on install. A route that was never visited online
// (a deep link, a bookmark) would otherwise fail outright when offline
// instead of booting the shell and letting the client-side router take it
// from there — every successful navigation response is cached under the
// same '/' key so it doubles as that fallback.
async function navigationFirst(request) {
	try {
		const response = await fetch(request);
		if (response.ok) (await caches.open(SHELL_CACHE)).put('/', response.clone());
		return response;
	} catch (err) {
		const shell = await (await caches.open(SHELL_CACHE)).match('/');
		if (shell) return shell;
		throw err;
	}
}

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	if (isDev) return; // let the browser hit the network directly, uncached
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	if (url.pathname === '/data/index.json') {
		event.respondWith(networkFirst(event.request, DATA_CACHE));
	} else if (url.pathname.startsWith('/data/runs/') || url.pathname.startsWith('/images/')) {
		event.respondWith(cacheFirst(event.request, IMMUTABLE_CACHE));
	} else if (event.request.mode === 'navigate') {
		event.respondWith(navigationFirst(event.request));
	} else {
		event.respondWith(cacheFirst(event.request, SHELL_CACHE));
	}
});
