// Isolates sync()'s orchestration (ordering, notification, error handling)
// from IndexedDB and Cache Storage, which db.ts/cache.ts already have their
// own tests for.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Run } from './schema.ts';
import { RETENTION_DAYS } from './window.ts';

vi.mock('./db.ts', () => ({
	storeRun: vi.fn(),
	syncedRunIds: vi.fn(),
	pruneRunsBefore: vi.fn()
}));
vi.mock('./cache.ts', () => ({ cacheImages: vi.fn() }));

import { sync } from './sync.ts';
import { pruneRunsBefore, storeRun, syncedRunIds } from './db.ts';
import { cacheImages } from './cache.ts';

function run(id: string): Run {
	return { id, generatedAt: `2026-01-01T00:00:0${id.length}.000Z`, articles: [] };
}

function jsonResponse(body: unknown, ok = true) {
	return { ok, json: async () => body };
}

beforeEach(() => {
	vi.mocked(storeRun).mockResolvedValue(undefined);
	vi.mocked(syncedRunIds).mockResolvedValue(new Set());
	vi.mocked(pruneRunsBefore).mockResolvedValue(undefined);
	vi.mocked(cacheImages).mockResolvedValue(undefined);
});

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

describe('sync', () => {
	it('throws when the index itself fails to fetch', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse(null, false))
		);
		await expect(sync()).rejects.toThrow('index fetch failed');
	});

	it('syncs the newest unseen run before resolving, and notifies it', async () => {
		const index = {
			runs: [
				{ id: 'b', publishedAt: '2026-01-02' },
				{ id: 'a', publishedAt: '2026-01-01' }
			]
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) =>
				url === '/data/index.json'
					? jsonResponse(index)
					: jsonResponse(run(url.includes('/b.') ? 'b' : 'a'))
			)
		);

		const synced: string[] = [];
		await sync((r) => synced.push(r.id));

		expect(synced).toEqual(['b']);
		expect(storeRun).toHaveBeenCalledWith('b', run('b').generatedAt, []);
		expect(cacheImages).toHaveBeenCalledWith([]);
	});

	it('skips runs already on the device', async () => {
		vi.mocked(syncedRunIds).mockResolvedValue(new Set(['b']));
		const index = {
			runs: [
				{ id: 'b', publishedAt: '2026-01-02' },
				{ id: 'a', publishedAt: '2026-01-01' }
			]
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) =>
				url === '/data/index.json' ? jsonResponse(index) : jsonResponse(run('a'))
			)
		);

		const synced: string[] = [];
		await sync((r) => synced.push(r.id));
		await vi.waitFor(() => expect(synced).toEqual(['a']));

		expect(storeRun).not.toHaveBeenCalledWith('b', expect.anything(), expect.anything());
	});

	it('backfills older runs in the background without blocking the caller', async () => {
		const index = {
			runs: [
				{ id: 'ccc', publishedAt: '2026-01-03' },
				{ id: 'bb', publishedAt: '2026-01-02' },
				{ id: 'a', publishedAt: '2026-01-01' }
			]
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url === '/data/index.json') return jsonResponse(index);
				const id = url.match(/runs\/(\w+)\.json/)![1];
				return jsonResponse(run(id));
			})
		);

		const synced: string[] = [];
		await sync((r) => synced.push(r.id));
		expect(synced).toEqual(['ccc']); // only the newest has landed by the time the promise resolves

		await vi.waitFor(() => expect(synced).toEqual(['ccc', 'bb', 'a']));
	});

	it("prunes to RETENTION_DAYS, not the collector's (shorter) publish window", async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ runs: [] }))
		);

		const before = Date.now();
		await sync();
		const after = Date.now();

		expect(pruneRunsBefore).toHaveBeenCalledTimes(1);
		const cutoff = new Date(vi.mocked(pruneRunsBefore).mock.calls[0][0]).getTime();
		const days = RETENTION_DAYS * 24 * 60 * 60 * 1000;
		expect(cutoff).toBeGreaterThanOrEqual(before - days - 1000);
		expect(cutoff).toBeLessThanOrEqual(after - days + 1000);
	});

	it('skips a run that fails to sync — newest or backfilled — without failing the rest', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const index = {
			runs: [
				{ id: 'bad', publishedAt: '2026-01-02' },
				{ id: 'a', publishedAt: '2026-01-01' }
			]
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url === '/data/index.json') return jsonResponse(index);
				if (url.includes('bad')) throw new Error('network error');
				return jsonResponse(run('a'));
			})
		);

		const synced: string[] = [];
		await sync((r) => synced.push(r.id));
		await vi.waitFor(() => expect(synced).toEqual(['a']));
	});
});
