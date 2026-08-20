// Runs arrive four times a day, at 00/06/12/18 Bangladesh time (UTC+6).
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
const SLOT_MS = 6 * 60 * 60 * 1000;

/** The next scheduled run's instant, strictly after `now`. */
export function nextRunAt(now = new Date()): Date {
	const bdNow = now.getTime() + BD_OFFSET_MS;
	const nextSlot = (Math.floor(bdNow / SLOT_MS) + 1) * SLOT_MS;
	return new Date(nextSlot - BD_OFFSET_MS);
}

/** "in 3h 24m" / "in 42m" / "any moment now" for a future instant. */
export function formatCountdown(target: Date, now = new Date()): string {
	const ms = Math.max(0, target.getTime() - now.getTime());
	const totalMinutes = Math.round(ms / 60_000);
	if (totalMinutes < 1) return 'any moment now';
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `in ${minutes}m`;
	return `in ${hours}h ${minutes}m`;
}

/**
 * "just now" / "12m ago" / "3h 24m ago" for a past instant — how stale an
 * article is relative to the run cadence (ADR: runs land every 6h). Falls
 * back to undefined past 24h, where a relative count stops being useful and
 * the caller should show an absolute date instead.
 */
export function formatElapsed(past: Date, now = new Date()): string | undefined {
	const totalMinutes = Math.floor(Math.max(0, now.getTime() - past.getTime()) / 60_000);
	if (totalMinutes >= 24 * 60) return undefined;
	if (totalMinutes < 1) return 'just now';
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours === 0) return `${minutes}m ago`;
	return `${hours}h ${minutes}m ago`;
}
