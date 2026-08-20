// Explicit image caching for offline reading (ADR-0009). Article text reaches
// IndexedDB via sync and is offline automatically; images are never in
// IndexedDB, so sync has to put them in Cache Storage itself — the unread
// ones need to be available offline before they're ever displayed, which
// view-time (on `<img>` load) caching can't provide.
import type { Article } from './schema.ts';
import { IMMUTABLE_CACHE } from './cacheNames.ts';

function hasCacheStorage(): boolean {
	return typeof caches !== 'undefined';
}

/** Caches every image in a set of articles. One dead image doesn't stop the rest. */
export async function cacheImages(articles: Article[]): Promise<void> {
	if (!hasCacheStorage()) return;
	const cache = await caches.open(IMMUTABLE_CACHE);
	const urls = articles.map((a) => a.image).filter((image) => image !== undefined);
	await Promise.allSettled(
		urls.map((url) => cache.add(url).catch((err) => console.error(`cache: ${url} failed:`, err)))
	);
}

/** Drops a run's cached JSON and images \u2014 the counterpart to IndexedDB pruning. */
export async function evictRun(runId: string, articles: Pick<Article, 'image'>[]): Promise<void> {
	if (!hasCacheStorage()) return;
	const cache = await caches.open(IMMUTABLE_CACHE);
	const urls = [
		`/data/runs/${runId}.json`,
		...articles.map((a) => a.image).filter((image) => image !== undefined)
	];
	// One failed delete (e.g. a corrupt cache entry) shouldn't strand the rest,
	// or bubble up and break the pruning/sync that triggered this.
	await Promise.allSettled(
		urls.map((url) =>
			cache.delete(url).catch((err) => console.error(`cache: evict ${url} failed:`, err))
		)
	);
}
