// Device storage. One IndexedDB database: articles (content + read state) and
// runs (which ones are already synced, so a reload never refetches them).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Article } from './schema.ts';
import { evictRun } from './cache.ts';

export type ReadState = 'unread' | 'read' | 'hidden';

export interface StoredArticle extends Article {
	state: ReadState;
	stateChangedAt: string; // ISO 8601 — ADR-0008
	dwellMs: number; // ADR-0008
}

export interface StoredRun {
	id: string;
	publishedAt: string; // ISO 8601, from the index — used for window pruning
	syncedAt: string;
}

interface SsreelDB extends DBSchema {
	articles: { key: string; value: StoredArticle; indexes: { runId: string } };
	runs: { key: string; value: StoredRun };
}

let dbPromise: Promise<IDBPDatabase<SsreelDB>> | undefined;

export function getDb() {
	dbPromise ??= openDB<SsreelDB>('ssreel', 1, {
		upgrade(db) {
			const articles = db.createObjectStore('articles', { keyPath: 'id' });
			articles.createIndex('runId', 'runId');
			db.createObjectStore('runs', { keyPath: 'id' });
		}
	});
	return dbPromise;
}

/** Test-only: drops the cached connection so a fresh database can be opened. */
export async function _resetDbForTests(): Promise<void> {
	(await dbPromise)?.close();
	dbPromise = undefined;
}

/** Run ids already stored on this device. */
export async function syncedRunIds(): Promise<Set<string>> {
	const db = await getDb();
	return new Set(await db.getAllKeys('runs'));
}

/** Store a run's articles as unread and mark the run synced. */
export async function storeRun(
	runId: string,
	publishedAt: string,
	articles: Article[]
): Promise<void> {
	const db = await getDb();
	const tx = db.transaction(['articles', 'runs'], 'readwrite');
	const now = new Date().toISOString();
	for (const article of articles) {
		await tx
			.objectStore('articles')
			.put({ ...article, state: 'unread', stateChangedAt: now, dwellMs: 0 });
	}
	await tx.objectStore('runs').put({ id: runId, publishedAt, syncedAt: now });
	await tx.done;
}

/** Drops runs (and their articles) published before the cutoff — they've left the window. */
export async function pruneRunsBefore(cutoffIso: string): Promise<void> {
	const db = await getDb();
	const staleRuns = (await db.getAll('runs')).filter((r) => r.publishedAt < cutoffIso);

	for (const run of staleRuns) {
		const tx = db.transaction(['articles', 'runs'], 'readwrite');
		const articles = await tx.objectStore('articles').index('runId').getAll(run.id);
		for (const article of articles) await tx.objectStore('articles').delete(article.id);
		await tx.objectStore('runs').delete(run.id);
		await tx.done;

		await evictRun(run.id, articles);
	}
}

export async function allArticles(): Promise<StoredArticle[]> {
	const db = await getDb();
	return db.getAll('articles');
}

/** Wipes every stored article and run — the device forgets everything it's synced. */
export async function clearAllArticles(): Promise<void> {
	const db = await getDb();
	const tx = db.transaction(['articles', 'runs'], 'readwrite');
	await tx.objectStore('articles').clear();
	await tx.objectStore('runs').clear();
	await tx.done;
}

export async function getArticle(id: string): Promise<StoredArticle | undefined> {
	const db = await getDb();
	return db.get('articles', id);
}

/** Newest run first, by weight-rank within a run. */
export function byRunThenRank(a: Article, b: Article): number {
	return b.runId.localeCompare(a.runId) || a.rank - b.rank;
}

/** Unread articles, newest run first and by weight within a run. */
export async function unreadArticles(): Promise<StoredArticle[]> {
	const articles = await allArticles();
	return articles.filter((a) => a.state === 'unread').sort(byRunThenRank);
}

/** Marks an article read and records how long the reader dwelt on it (ADR-0008). */
export async function markRead(id: string, dwellMs: number): Promise<void> {
	await setState(id, 'read', { dwellMs });
}

/** Dismisses an article so it never returns to the reel — still kept on the device. */
export async function hideArticle(id: string): Promise<void> {
	await setState(id, 'hidden');
}

/** Undoes a hide, restoring the article to the reel at its original position. */
export async function unhideArticle(id: string): Promise<void> {
	await setState(id, 'unread');
}

async function setState(
	id: string,
	state: ReadState,
	extra: Partial<StoredArticle> = {}
): Promise<void> {
	const db = await getDb();
	// One transaction for the read-modify-write, so a concurrent state change
	// for the same article can't interleave between the get and the put.
	const tx = db.transaction('articles', 'readwrite');
	const article = await tx.store.get(id);
	if (article) {
		await tx.store.put({ ...article, ...extra, state, stateChangedAt: new Date().toISOString() });
	}
	await tx.done;
}
