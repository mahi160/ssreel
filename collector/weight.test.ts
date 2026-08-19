import { describe, expect, it } from 'vitest';
import { orderByWeight } from './weight.ts';
import type { Article } from '../src/lib/data/schema.ts';
import type { Source } from './sources.ts';

const sources: Source[] = [
	{ name: 'Big', feedUrl: 'https://big.example/feed', weight: 5, defaultSection: 'Local' },
	{ name: 'Small A', feedUrl: 'https://a.example/feed', weight: 2, defaultSection: 'Local' },
	{ name: 'Small B', feedUrl: 'https://b.example/feed', weight: 2, defaultSection: 'Local' },
	{ name: 'Small C', feedUrl: 'https://c.example/feed', weight: 2, defaultSection: 'Local' }
];

function article(source: string, headline: string): Article {
	return {
		id: `${source}-${headline}`,
		headline,
		excerpt: '',
		body: '',
		section: 'Local',
		url: `https://example.com/${source}/${headline}`,
		source,
		publishedAt: new Date().toISOString(),
		runId: 'run-1',
		rank: 0
	};
}

describe('orderByWeight', () => {
	it('lets several small outlets echoing the same story outrank one bigger exclusive', () => {
		const exclusive = article('Big', 'A one-off exclusive');
		const echoed = [
			article('Small A', 'Same story everywhere'),
			article('Small B', 'Same story everywhere'),
			article('Small C', 'Same story everywhere')
		];
		const result = orderByWeight([exclusive, ...echoed], sources);
		expect(result[0].headline).toBe('Same story everywhere');
		expect(result.at(-1)).toBe(exclusive);
	});

	it('is case- and punctuation-insensitive when matching the same story', () => {
		const a = article('Small A', 'Big News, Today!');
		const b = article('Small B', 'big news today');
		const c = article('Small C', 'BIG NEWS TODAY');
		// Three small outlets (weight 2 each = 6) echoing the same story outweigh a solo Big (5).
		const solo = article('Big', 'Unrelated exclusive');
		const result = orderByWeight([solo, a, b, c], sources);
		expect(result[0]).not.toBe(solo);
		expect(result.at(-1)).toBe(solo);
	});
});
