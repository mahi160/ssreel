// Device storage. One IndexedDB database: articles (content + read state) and
// runs (which ones are already synced, so a reload never refetches them).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Article } from './schema.ts';

export type ReadState = 'unread' | 'read' | 'hidden';

export interface StoredArticle extends Article {
	state: ReadState;
	stateChangedAt: string; // ISO 8601 — ADR-0008
	dwellMs: number; // ADR-0008
}

interface SsreelDB extends DBSchema {
	articles: { key: string; value: StoredArticle; indexes: { runId: string } };
	runs: { key: string; value: { id: string; syncedAt: string } };
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
export async function storeRun(runId: string, articles: Article[]): Promise<void> {
	const db = await getDb();
	const tx = db.transaction(['articles', 'runs'], 'readwrite');
	const now = new Date().toISOString();
	for (const article of articles) {
		await tx
			.objectStore('articles')
			.put({ ...article, state: 'unread', stateChangedAt: now, dwellMs: 0 });
	}
	await tx.objectStore('runs').put({ id: runId, syncedAt: now });
	await tx.done;
}

export async function allArticles(): Promise<StoredArticle[]> {
	const db = await getDb();
	return db.getAll('articles');
}

/** Unread articles, newest run first and by weight within a run. */
export async function unreadArticles(): Promise<StoredArticle[]> {
	const articles = await allArticles();
	return articles
		.filter((a) => a.state === 'unread')
		.sort((a, b) => b.runId.localeCompare(a.runId) || a.rank - b.rank);
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
	const article = await db.get('articles', id);
	if (!article) return;
	await db.put('articles', { ...article, ...extra, state, stateChangedAt: new Date().toISOString() });
}
