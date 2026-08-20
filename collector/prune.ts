// Runs and their images are pruned to the same window as everything else
// published (ADR-0004/0005/0010) — a publishing policy, not a performance
// trade-off, since devices keep whatever they already downloaded regardless.
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WINDOW_DAYS } from '../src/lib/data/window.ts';
import type { Index, Run } from '../src/lib/data/schema.ts';

const OUT_DIR = path.join(import.meta.dirname, '../static/data');
const INDEX_PATH = path.join(OUT_DIR, 'index.json');
const RUNS_DIR = path.join(OUT_DIR, 'runs');
const IMAGES_DIR = path.join(import.meta.dirname, '../static/images');

export function windowCutoff(now = new Date()): string {
	return new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Removes published runs (and their images) older than the window, and rewrites the index. */
export async function prunePublished(cutoffIso = windowCutoff()): Promise<void> {
	let index: Index;
	try {
		index = JSON.parse(await readFile(INDEX_PATH, 'utf-8'));
	} catch {
		return; // nothing published yet
	}

	const stale = index.runs.filter((r) => r.publishedAt < cutoffIso);
	index.runs = index.runs.filter((r) => r.publishedAt >= cutoffIso);

	for (const summary of stale) {
		const runPath = path.join(RUNS_DIR, `${summary.id}.json`);
		try {
			const run: Run = JSON.parse(await readFile(runPath, 'utf-8'));
			for (const article of run.articles) {
				if (article.image)
					await rm(path.join(IMAGES_DIR, path.basename(article.image)), { force: true });
			}
		} catch {
			// Run file already gone or unreadable — nothing more to clean up for it.
		}
		await rm(runPath, { force: true });
	}

	await writeFile(INDEX_PATH, JSON.stringify(index, null, '\t'));
}
