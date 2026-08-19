// A device reconciling itself against the index and downloading what it lacks.
import type { Index, Run } from './schema.ts';
import { pruneRunsBefore, storeRun, syncedRunIds } from './db.ts';
import { WINDOW_DAYS } from './window.ts';

async function syncRun(id: string): Promise<Run | undefined> {
	// One bad run — network or JSON failure — shouldn't block the rest.
	try {
		const runRes = await fetch(`/data/runs/${id}.json`);
		if (!runRes.ok) return undefined;
		const run: Run = await runRes.json();
		await storeRun(run.id, run.generatedAt, run.articles);
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

/**
 * Fetches the index, prunes runs that have left the window, then syncs
 * whatever's missing — newest run first, so reading can begin before older
 * runs finish backfilling. `onRunSynced` fires with each run as it's stored,
 * including ones synced in the background after this promise resolves.
 */
export async function sync(onRunSynced?: (run: Run) => void): Promise<void> {
	const res = await fetch('/data/index.json');
	if (!res.ok) throw new Error(`index fetch failed: ${res.status}`);
	const index: Index = await res.json();

	const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
	await pruneRunsBefore(cutoff);

	const have = await syncedRunIds();
	const [newest, ...rest] = index.runs.filter((r) => !have.has(r.id));

	if (newest) notify(onRunSynced, await syncRun(newest.id));

	// Backfill older runs in the background, without blocking the caller.
	void (async () => {
		for (const summary of rest) notify(onRunSynced, await syncRun(summary.id));
	})();
}
