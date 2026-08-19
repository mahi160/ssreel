// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { _resetDbForTests, allArticles, markRead, storeRun, unreadArticles } from './db.ts';
import type { Article } from './schema.ts';

function article(overrides: Partial<Article>): Article {
	return {
		id: 'a',
		headline: 'Headline',
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

beforeEach(async () => {
	await _resetDbForTests();
	indexedDB.deleteDatabase('ssreel');
});

describe('storeRun / unreadArticles', () => {
	it('orders unread articles by newest run first, then by rank within a run', async () => {
		await storeRun('run-1', [
			article({ id: 'a', runId: 'run-1', rank: 1 }),
			article({ id: 'b', runId: 'run-1', rank: 0 })
		]);
		await storeRun('run-2', [article({ id: 'c', runId: 'run-2', rank: 0 })]);

		const unread = await unreadArticles();
		expect(unread.map((a) => a.id)).toEqual(['c', 'b', 'a']);
	});

	it('excludes read and hidden articles', async () => {
		await storeRun('run-1', [article({ id: 'a' }), article({ id: 'b' })]);
		await markRead('a', 5000);

		const unread = await unreadArticles();
		expect(unread.map((u) => u.id)).toEqual(['b']);
	});
});

describe('markRead', () => {
	it('records the read state, timestamp and dwell time', async () => {
		await storeRun('run-1', [article({ id: 'a' })]);
		await markRead('a', 4200);

		const [stored] = await allArticles();
		expect(stored.state).toBe('read');
		expect(stored.dwellMs).toBe(4200);
		expect(stored.stateChangedAt).toBeTruthy();
	});
});
