// Crossing this threshold while a card is the active one is what marks an
// article read (ADR-0008); a fast flick past leaves it unread. The threshold
// is a per-device setting (src/lib/data/settings.svelte.ts), read live so a
// change on the Settings page takes effect without a reload.
import { settings } from '#lib/data/settings.svelte.js';

/**
 * Svelte action: calls `onRead(dwellMs)` once, when the node stops being the
 * active (>60% visible) card, but only if it was active past the current
 * dwell threshold.
 */
export function dwellTracker(node: HTMLElement, onRead: (dwellMs: number) => void) {
	let enteredAt: number | undefined;

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
				enteredAt = performance.now();
				return;
			}
			if (enteredAt === undefined) return;
			const dwellMs = performance.now() - enteredAt;
			enteredAt = undefined;
			if (dwellMs >= settings.dwellMs) onRead(dwellMs);
		},
		{ threshold: [0, 0.6] }
	);
	observer.observe(node);

	return { destroy: () => observer.disconnect() };
}
