import { describe, expect, it } from 'vitest';
import { classifySection } from './section.ts';

describe('classifySection', () => {
	it('classifies by a keyword in the URL path', () => {
		expect(classifySection('https://example.com/sport/football/1', [], 'Local')).toBe('Sports');
	});

	it('classifies by an RSS category when the URL gives no hint', () => {
		expect(classifySection('https://example.com/1', ['Technology'], 'Local')).toBe('Tech');
	});

	it('falls back to the source default when nothing matches', () => {
		expect(classifySection('https://example.com/1', [], 'Local')).toBe('Local');
	});

	it('prefers the more specific Sports match over International', () => {
		expect(classifySection('https://example.com/international/cricket/1', [], 'Local')).toBe(
			'Sports'
		);
	});
});
