import { describe, expect, it } from 'vitest';
import { windowCutoff } from './prune.ts';

describe('windowCutoff', () => {
	it('is WINDOW_DAYS (1) before now', () => {
		const now = new Date('2026-01-10T00:00:00.000Z');
		expect(windowCutoff(now)).toBe('2026-01-09T00:00:00.000Z');
	});
});
