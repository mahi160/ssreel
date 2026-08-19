import { describe, expect, it } from 'vitest';
import { articleId } from './id.ts';

describe('articleId', () => {
	it('is stable across repeat runs on the same URL', () => {
		const url = 'https://example.com/a/story-1';
		expect(articleId(url)).toBe(articleId(url));
	});

	it('strips tracking params so they do not change identity', () => {
		const bare = articleId('https://example.com/a/story-1');
		const tracked = articleId('https://example.com/a/story-1?utm_source=fb&fbclid=abc');
		expect(tracked).toBe(bare);
	});

	it('is order-independent for the params it keeps', () => {
		const a = articleId('https://example.com/a?x=1&y=2');
		const b = articleId('https://example.com/a?y=2&x=1');
		expect(a).toBe(b);
	});

	it('gives genuinely different articles different ids for a differing non-tracking param', () => {
		const a = articleId('https://example.com/a?p=1');
		const b = articleId('https://example.com/a?p=2');
		expect(a).not.toBe(b);
	});

	it('is case-insensitive on host', () => {
		const a = articleId('https://Example.com/a');
		const b = articleId('https://example.com/a');
		expect(a).toBe(b);
	});
});
