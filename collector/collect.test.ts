import { describe, expect, it } from 'vitest';
import { dedupeById } from './collect.ts';
import type { Article } from '../src/lib/data/schema.ts';

function article(id: string, source: string): Article {
	return {
		id,
		headline: 'Same story',
		excerpt: '',
		body: '',
		section: 'Local',
		url: `https://example.com/${id}`,
		source,
		publishedAt: new Date().toISOString(),
		runId: 'run-1',
		rank: 0
	};
}

describe('dedupeById', () => {
	it('keeps only the first occurrence of a repeated id', () => {
		const a = article('same-id', 'BBC News World');
		const b = article('same-id', 'BBC Sport');
		expect(dedupeById([a, b])).toEqual([a]);
	});

	it('keeps distinct ids untouched, in order', () => {
		const a = article('a', 'X');
		const b = article('b', 'Y');
		expect(dedupeById([a, b])).toEqual([a, b]);
	});
});
