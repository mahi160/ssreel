// A device reconciling itself against the index and downloading what it lacks.
import type { Index, Run } from './schema.ts';
import { pruneRunsBefore, storeRun, syncedRunIds } from './db.ts';
import { cacheImages } from './cache.ts';
import { RETENTION_DAYS } from './window.ts';

async function syncRun(id: string): Promise<Run | undefined> {
	// One bad run — network or JSON failure — shouldn't block the rest.
	try {
		const runRes = await fetch(`/data/runs/${id}.json`);
		if (!runRes.ok) return undefined;
		const run: Run = await runRes.json();
		await storeRun(run.id, run.generatedAt, run.articles);
		await cacheImages(run.articles); // best-effort; storeRun above is what actually matters
		return run;
	} catch (err) {
		console.error(`sync: run ${id} failed:`, err);
		return undefined;
	}
}

function notify(onRunSynced: ((run: Run) => void) | undefined, run: Run | undefined) {
	if (!run || !onRunSynced) return;
	try {
		onRunSynced(run);
	} catch (err) {
		console.error('sync: onRunSynced callback failed:', err);
	}
}

function retentionCutoff(): string {
	return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Evicts runs that have left the retention window — the destructive half of
 * sync, split out (ADR-0014) so callers can fetch/store without it. */
export async function pruneStale(): Promise<void> {
	await pruneRunsBefore(retentionCutoff());
}

/**
 * Fetches the index, prunes runs that have left the window (unless told not
 * to — ADR-0014: a mid-session sync while someone is reading shouldn't evict
 * the run under them), then syncs whatever's missing — newest run first, so
 * reading can begin before older runs finish backfilling. `onRunSynced` fires
 * with each run as it's stored, including ones synced in the background
 * after this promise resolves.
 */
export async function sync(
	onRunSynced?: (run: Run) => void,
	{ prune = true }: { prune?: boolean } = {}
): Promise<void> {
	const res = await fetch('/data/index.json');
	if (!res.ok) throw new Error(`index fetch failed: ${res.status}`);
	const index: Index = await res.json();

	if (prune) await pruneRunsBefore(retentionCutoff());

	const have = await syncedRunIds();
	const [newest, ...rest] = index.runs.filter((r) => !have.has(r.id));

	if (newest) notify(onRunSynced, await syncRun(newest.id));

	// Backfill older runs in the background, without blocking the caller.
	void (async () => {
		for (const summary of rest) notify(onRunSynced, await syncRun(summary.id));
	})();
}
