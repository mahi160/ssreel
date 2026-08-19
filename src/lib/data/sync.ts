// A device reconciling itself against the index and downloading what it lacks.
import type { Index, Run } from './schema.ts';
import { storeRun, syncedRunIds } from './db.ts';

/** Fetch the index and store any run the device does not already have. */
export async function sync(): Promise<void> {
	const res = await fetch('/data/index.json');
	if (!res.ok) throw new Error(`index fetch failed: ${res.status}`);
	const index: Index = await res.json();

	const have = await syncedRunIds();
	const missing = index.runs.filter((r) => !have.has(r.id));

	for (const summary of missing) {
		// One bad run — network, JSON or storage failure — shouldn't block the rest.
		try {
			const runRes = await fetch(`/data/runs/${summary.id}.json`);
			if (!runRes.ok) continue;
			const run: Run = await runRes.json();
			await storeRun(run.id, run.articles);
		} catch (err) {
			console.error(`sync: run ${summary.id} failed:`, err);
		}
	}
}
