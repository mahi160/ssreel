// caches (Cache Storage) isn't implemented by node or happy-dom, so this
// stands in a minimal fake: enough of Cache/CacheStorage for cacheImages and
// evictRun to exercise their real logic against.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheImages, evictRun } from './cache.ts';
import type { Article } from './schema.ts';

class FakeCache {
	store = new Set<string>();
	async add(url: string) {
		if (url.includes('fails')) throw new Error('network error');
		this.store.add(url);
	}
	async delete(url: string) {
		return this.store.delete(url);
	}
}

function article(overrides: Partial<Article> = {}): Article {
	return {
		id: 'a',
		headline: 'H',
		excerpt: '',
		body: '',
		section: 'Local',
		url: 'https://example.com/a',
		source: 'Source',
		publishedAt: new Date().toISOString(),
		runId: 'run-1',
		rank: 0,
		...overrides
	};
}

let cache: FakeCache;

beforeEach(() => {
	cache = new FakeCache();
	vi.stubGlobal('caches', { open: async () => cache });
});

afterEach(() => vi.unstubAllGlobals());

describe('cacheImages', () => {
	it('caches every article image, skipping articles without one', async () => {
		await cacheImages([article({ image: '/images/a.webp' }), article({ id: 'b' })]);
		expect(cache.store).toEqual(new Set(['/images/a.webp']));
	});

	it("one dead image doesn't stop the rest from caching", async () => {
		await cacheImages([
			article({ id: 'a', image: '/images/fails.webp' }),
			article({ id: 'b', image: '/images/b.webp' })
		]);
		expect(cache.store).toEqual(new Set(['/images/b.webp']));
	});

	it('does nothing when Cache Storage is unavailable', async () => {
		vi.stubGlobal('caches', undefined);
		await expect(cacheImages([article({ image: '/images/a.webp' })])).resolves.toBeUndefined();
	});
});

describe('evictRun', () => {
	it("drops a run's cached JSON and images", async () => {
		cache.store = new Set(['/data/runs/run-1.json', '/images/a.webp', '/images/keep.webp']);
		await evictRun('run-1', [{ image: '/images/a.webp' }]);
		expect(cache.store).toEqual(new Set(['/images/keep.webp']));
	});
});
