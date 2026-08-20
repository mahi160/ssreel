// settings.svelte.ts uses Svelte 5 runes ($state), which need the Svelte
// compiler to process — outside a real Svelte/vite pipeline (this vitest
// config has no svelte plugin), that file can't just be imported. Mocking it
// out entirely keeps this test focused on dwellTracker's own logic.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settingsMock = vi.hoisted(() => ({ settings: { dwellMs: 4000 } }));
vi.mock('#lib/data/settings.svelte.js', () => settingsMock);

import { dwellTracker } from './dwell.ts';

class FakeIntersectionObserver {
	static last: FakeIntersectionObserver | undefined;
	observe = vi.fn();
	disconnect = vi.fn();
	constructor(private callback: IntersectionObserverCallback) {
		FakeIntersectionObserver.last = this;
	}
	fire(isIntersecting: boolean, intersectionRatio: number) {
		this.callback(
			[{ isIntersecting, intersectionRatio } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

beforeEach(() => {
	vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
	settingsMock.settings.dwellMs = 4000;
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('dwellTracker', () => {
	it('fires onActive on entering and onRead once dwell crosses the threshold', () => {
		vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(4500);
		const onActive = vi.fn();
		const onRead = vi.fn();

		dwellTracker({} as HTMLElement, { onActive, onRead });
		const observer = FakeIntersectionObserver.last!;

		observer.fire(true, 0.8);
		expect(onActive).toHaveBeenCalledOnce();
		expect(onRead).not.toHaveBeenCalled();

		observer.fire(false, 0);
		expect(onRead).toHaveBeenCalledWith(4500);
	});

	it('does not mark read on a fast flick past under the threshold', () => {
		vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(500);
		const onRead = vi.fn();

		dwellTracker({} as HTMLElement, { onRead });
		const observer = FakeIntersectionObserver.last!;
		observer.fire(true, 0.8);
		observer.fire(false, 0);

		expect(onRead).not.toHaveBeenCalled();
	});

	it('ignores an intersection below the visibility threshold', () => {
		const onActive = vi.fn();
		dwellTracker({} as HTMLElement, { onActive, onRead: vi.fn() });
		FakeIntersectionObserver.last!.fire(true, 0.3); // below the 0.6 cutoff

		expect(onActive).not.toHaveBeenCalled();
	});

	it('disconnects the observer on destroy', () => {
		const controls = dwellTracker({} as HTMLElement, { onRead: vi.fn() });
		const observer = FakeIntersectionObserver.last!;

		controls.destroy();

		expect(observer.disconnect).toHaveBeenCalledOnce();
	});
});
