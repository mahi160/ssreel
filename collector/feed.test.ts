import { describe, expect, it } from 'vitest';
import Parser from 'rss-parser';
import { cdata, escapeXml, feedXml } from './feed.ts';
import type { Article } from '../src/lib/data/schema.ts';

function article(overrides: Partial<Article> = {}): Article {
	return {
		id: 'abc123',
		headline: 'A "quoted" headline & more',
		excerpt: 'Short excerpt with <angle> brackets & an ampersand.',
		body: 'A much longer body. '.repeat(50) + ']]> not a real CDATA close',
		section: 'Local',
		url: 'https://publisher.example/original-article',
		source: 'Test Outlet',
		publishedAt: '2026-01-02T03:04:05.000Z',
		runId: 'run-1',
		rank: 0,
		...overrides
	};
}

describe('escapeXml', () => {
	it('escapes the reserved XML characters', () => {
		expect(escapeXml('A & B < C > D')).toBe('A &amp; B &lt; C &gt; D');
	});
});

describe('cdata', () => {
	it('splits an embedded ]]> so it cannot close the CDATA section early', () => {
		expect(cdata('before ]]> after')).toBe('<![CDATA[before ]]]]><![CDATA[> after]]>');
	});
});

describe('feedXml', () => {
	it('produces a feed a real RSS consumer can parse, with the expected fields', async () => {
		const xml = feedXml([article()]);
		const feed = await new Parser({ customFields: { item: ['content:encoded'] } }).parseString(xml);

		expect(feed.items).toHaveLength(1);
		const item = feed.items[0];
		expect(item.title).toBe('A "quoted" headline & more');
		// Links to the publisher's original, never to our own site.
		expect(item.link).toBe('https://publisher.example/original-article');
		expect(item.content).toContain('Short excerpt with <angle> brackets');
		expect((item as unknown as { 'content:encoded': string })['content:encoded']).toContain(
			'A much longer body.'
		);
	});

	it('orders items newest first regardless of input order', async () => {
		const older = article({
			id: 'old',
			publishedAt: '2026-01-01T00:00:00.000Z',
			headline: 'Older'
		});
		const newer = article({
			id: 'new',
			publishedAt: '2026-01-02T00:00:00.000Z',
			headline: 'Newer'
		});
		const feed = await new Parser().parseString(feedXml([older, newer]));
		expect(feed.items.map((i) => i.title)).toEqual(['Newer', 'Older']);
	});
});
