import { describe, expect, it } from 'vitest';
import { formatCountdown, nextRunAt } from './schedule.ts';

describe('nextRunAt', () => {
	it('finds the next slot later the same BD day', () => {
		// 2026-01-01 03:00 BD = 2025-12-31 21:00 UTC. Next slot: 06:00 BD = 00:00 UTC.
		const now = new Date('2025-12-31T21:00:00Z');
		expect(nextRunAt(now).toISOString()).toBe('2026-01-01T00:00:00.000Z');
	});

	it('rolls into the next BD day after the last slot', () => {
		// 2026-01-01 23:00 BD = 2026-01-01 17:00 UTC. Next slot: 00:00 BD next day = 18:00 UTC.
		const now = new Date('2026-01-01T17:00:00Z');
		expect(nextRunAt(now).toISOString()).toBe('2026-01-01T18:00:00.000Z');
	});

	it('is strictly after now, even exactly on a slot boundary', () => {
		// Exactly 06:00 BD = 00:00 UTC. Next slot should be 12:00 BD = 06:00 UTC, not the same instant.
		const now = new Date('2026-01-01T00:00:00Z');
		expect(nextRunAt(now).toISOString()).toBe('2026-01-01T06:00:00.000Z');
	});
});

describe('formatCountdown', () => {
	it('formats hours and minutes', () => {
		const now = new Date('2026-01-01T00:00:00Z');
		expect(formatCountdown(new Date('2026-01-01T03:24:00Z'), now)).toBe('in 3h 24m');
	});

	it('formats minutes only under an hour', () => {
		const now = new Date('2026-01-01T00:00:00Z');
		expect(formatCountdown(new Date('2026-01-01T00:42:00Z'), now)).toBe('in 42m');
	});

	it('says "any moment now" once under a minute away', () => {
		const now = new Date('2026-01-01T00:00:00Z');
		expect(formatCountdown(new Date('2026-01-01T00:00:10Z'), now)).toBe('any moment now');
	});
});
