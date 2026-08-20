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

declare const __BUILD_ID__: string;
const SHELL_CACHE = `ssreel-shell-${__BUILD_ID__}`;

self.addEventListener('install', (event) => {
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

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	if (url.pathname === '/data/index.json') {
		event.respondWith(networkFirst(event.request, DATA_CACHE));
	} else if (url.pathname.startsWith('/data/runs/') || url.pathname.startsWith('/images/')) {
		event.respondWith(cacheFirst(event.request, IMMUTABLE_CACHE));
	} else {
		event.respondWith(cacheFirst(event.request, SHELL_CACHE));
	}
});
