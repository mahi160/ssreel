// Suppresses articles already emitted in an earlier run. State is committed
// by CI (ADR-0002) so the next scheduled run picks up where this one left off.
// Timestamped so it can be windowed the same as published runs (ticket 13) —
// an article that fell out of the window and somehow reappears is treated as
// new content again, which is fine (ADR-0007).
import { readFile, writeFile } from 'node:fs/promises';

const STATE_PATH = new URL('./state.json', import.meta.url);

export type SeenIds = Map<string, string>; // article id -> first-seen ISO timestamp

export async function loadSeenIds(): Promise<SeenIds> {
	try {
		const parsed: unknown = JSON.parse(await readFile(STATE_PATH, 'utf-8'));
		if (!Array.isArray(parsed)) return new Map();
		// Migrates the pre-ticket-13 format (a bare array of ids, no timestamp):
		// treat every entry as first-seen now, so it ages out of the window from
		// this point rather than being lost or mis-parsed.
		if (typeof parsed[0] === 'string') {
			const now = new Date().toISOString();
			return new Map((parsed as string[]).map((id) => [id, now]));
		}
		return new Map(parsed as [string, string][]);
	} catch {
		return new Map();
	}
}

export async function saveSeenIds(seen: SeenIds): Promise<void> {
	await writeFile(STATE_PATH, JSON.stringify([...seen.entries()]));
}

/** Drops entries first seen before the cutoff \u2014 keeps state.json bounded. */
export function pruneSeenIds(seen: SeenIds, cutoffIso: string): SeenIds {
	return new Map([...seen.entries()].filter(([, firstSeenAt]) => firstSeenAt >= cutoffIso));
}
