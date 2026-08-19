import { describe, expect, it } from 'vitest';
import { isMuted } from './mute.ts';
import type { Article } from './schema.ts';

function article(overrides: Partial<Article> = {}): Article {
	return {
		id: 'a',
		headline: 'H',
		excerpt: '',
		body: '',
		section: 'Sports',
		url: 'https://example.com/a',
		source: 'BBC Sport',
		publishedAt: new Date().toISOString(),
		runId: 'run-1',
		rank: 0,
		...overrides
	};
}

describe('isMuted', () => {
	it('is muted when its section is muted', () => {
		expect(isMuted(article(), { mutedSections: ['Sports'], mutedSources: [] })).toBe(true);
	});

	it('is muted when its source is muted', () => {
		expect(isMuted(article(), { mutedSections: [], mutedSources: ['BBC Sport'] })).toBe(true);
	});

	it('is not muted when neither matches', () => {
		expect(isMuted(article(), { mutedSections: ['Tech'], mutedSources: ['Variety'] })).toBe(false);
	});
});
