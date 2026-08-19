// Suppresses articles already emitted in an earlier run. State is committed
// by CI (ADR-0002) so the next scheduled run picks up where this one left off.
import { readFile, writeFile } from 'node:fs/promises';

const STATE_PATH = new URL('./state.json', import.meta.url);

export async function loadSeenIds(): Promise<Set<string>> {
	try {
		return new Set(JSON.parse(await readFile(STATE_PATH, 'utf-8')));
	} catch {
		return new Set();
	}
}

export async function saveSeenIds(ids: Set<string>): Promise<void> {
	await writeFile(STATE_PATH, JSON.stringify([...ids]));
}
