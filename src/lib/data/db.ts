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
