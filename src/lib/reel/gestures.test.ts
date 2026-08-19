import { describe, expect, it } from 'vitest';
import { classifyGesture } from './gestures.ts';

describe('classifyGesture', () => {
	it('is a tap when the pointer barely moves', () => {
		expect(classifyGesture(2, -3, false)).toBe('tap');
	});

	it('is a hide on a leftward swipe past the threshold', () => {
		expect(classifyGesture(-120, 5, false)).toBe('hide');
	});

	it('does nothing on a rightward swipe (ADR-0006: reserved for iOS back-navigation)', () => {
		expect(classifyGesture(120, 5, false)).toBe('none');
	});

	it('ignores a leftward swipe that started in the edge gutter', () => {
		expect(classifyGesture(-120, 5, true)).toBe('none');
	});

	it('does nothing when the vertical movement dominates (a page swipe, not a hide)', () => {
		expect(classifyGesture(-100, 200, false)).toBe('none');
	});

	it('does nothing below the hide distance threshold', () => {
		expect(classifyGesture(-40, 2, false)).toBe('none');
	});
});
