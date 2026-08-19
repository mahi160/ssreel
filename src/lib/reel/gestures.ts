// A tap expands a card in place; a leftward swipe hides it. Rightward swipe
// is deliberately unassigned (ADR-0006) — iOS reserves it for back
// navigation and that cannot be reliably suppressed in an installed PWA, so
// we never fight it, we just never treat it as a hide.
const TAP_MAX_MOVE = 10;
const HIDE_THRESHOLD = 80;
const EDGE_GUTTER = 24;

export type GestureResult = 'tap' | 'hide' | 'none';

/** Pure decision: given a pointer's start/end delta, what gesture was it? */
export function classifyGesture(dx: number, dy: number, startedInGutter: boolean): GestureResult {
	const absDx = Math.abs(dx);
	const absDy = Math.abs(dy);

	if (absDx < TAP_MAX_MOVE && absDy < TAP_MAX_MOVE) return 'tap';
	// An edge-initiated horizontal drag is never a hide, whichever direction.
	if (startedInGutter) return 'none';
	if (absDx > absDy && absDx > HIDE_THRESHOLD && dx < 0) return 'hide';
	return 'none';
}

export interface CardGestureHandlers {
	onTap: () => void;
	onHide: () => void;
}

/** Svelte action wiring classifyGesture to a card element's pointer events. */
export function cardGestures(node: HTMLElement, handlers: CardGestureHandlers) {
	let startX = 0;
	let startY = 0;
	let startedInGutter = false;

	function onPointerDown(e: PointerEvent) {
		startX = e.clientX;
		startY = e.clientY;
		startedInGutter = startX < EDGE_GUTTER || startX > window.innerWidth - EDGE_GUTTER;
	}

	function onPointerUp(e: PointerEvent) {
		const gesture = classifyGesture(e.clientX - startX, e.clientY - startY, startedInGutter);
		if (gesture === 'tap') handlers.onTap();
		else if (gesture === 'hide') handlers.onHide();
	}

	node.addEventListener('pointerdown', onPointerDown);
	node.addEventListener('pointerup', onPointerUp);
	return {
		destroy() {
			node.removeEventListener('pointerdown', onPointerDown);
			node.removeEventListener('pointerup', onPointerUp);
		}
	};
}
