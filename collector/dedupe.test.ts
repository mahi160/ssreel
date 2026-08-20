import { readFile, writeFile, unlink } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadSeenIds, pruneSeenIds } from './dedupe.ts';

const STATE_PATH = new URL('./state.json', import.meta.url);

async function withState(content: string, fn: () => Promise<void>) {
	const original = await readFile(STATE_PATH, 'utf-8').catch(() => undefined);
	await writeFile(STATE_PATH, content);
	try {
		await fn();
	} finally {
		if (original === undefined) await unlink(STATE_PATH).catch(() => {});
		else await writeFile(STATE_PATH, original);
	}
}

describe('loadSeenIds', () => {
	it('migrates the pre-ticket-13 bare-array format, treating entries as seen now', async () => {
		await withState(JSON.stringify(['old-id-1', 'old-id-2']), async () => {
			const seen = await loadSeenIds();
			expect(seen.has('old-id-1')).toBe(true);
			expect(seen.has('old-id-2')).toBe(true);
			expect(new Date(seen.get('old-id-1')!).getTime()).toBeGreaterThan(Date.now() - 5000);
		});
	});

	it('round-trips the current [id, timestamp] format', async () => {
		await withState(JSON.stringify([['a', '2026-01-01T00:00:00.000Z']]), async () => {
			const seen = await loadSeenIds();
			expect(seen.get('a')).toBe('2026-01-01T00:00:00.000Z');
		});
	});
});

describe('pruneSeenIds', () => {
	it('drops entries first seen before the cutoff', () => {
		const seen = new Map([
			['old', '2026-01-01T00:00:00.000Z'],
			['new', '2026-01-10T00:00:00.000Z']
		]);
		const pruned = pruneSeenIds(seen, '2026-01-05T00:00:00.000Z');
		expect([...pruned.keys()]).toEqual(['new']);
	});

	it('keeps everything when nothing is older than the cutoff', () => {
		const seen = new Map([['a', '2026-01-10T00:00:00.000Z']]);
		expect(pruneSeenIds(seen, '2026-01-01T00:00:00.000Z').size).toBe(1);
	});
});
