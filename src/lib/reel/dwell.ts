// Crossing this threshold while a card is the active one is what marks an
// article read (ADR-0008); a fast flick past leaves it unread. The threshold
// is a per-device setting (src/lib/data/settings.svelte.ts), read live so a
// change on the Settings page takes effect without a reload.
import { settings } from '#lib/data/settings.svelte.js';

export interface DwellHandlers {
	/** Fires as soon as the card becomes the active one — e.g. to track "current article" for the desktop pane. */
	onActive?: () => void;
	/** Fires once, when the card stops being active, but only if it was active past the dwell threshold. */
	onRead: (dwellMs: number) => void;
}

/** Svelte action wiring an element's visibility to DwellHandlers. */
export function dwellTracker(node: HTMLElement, handlers: DwellHandlers) {
	let enteredAt: number | undefined;

	const observer = new IntersectionObserver(
		([entry]) => {
			if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
				enteredAt = performance.now();
				handlers.onActive?.();
				return;
			}
			if (enteredAt === undefined) return;
			const dwellMs = performance.now() - enteredAt;
			enteredAt = undefined;
			if (dwellMs >= settings.dwellMs) handlers.onRead(dwellMs);
		},
		{ threshold: [0, 0.6] }
	);
	observer.observe(node);

	return { destroy: () => observer.disconnect() };
}
