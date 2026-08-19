import type { Section } from '../src/lib/data/schema.ts';

// Checked in order, most specific first, against the article's URL path and
// RSS categories — cheap enough to file even outlets whose single feed mixes
// sections, without a classifier model.
const SECTION_KEYWORDS: [Section, string[]][] = [
	['Sports', ['sport', 'cricket', 'football']],
	['Entertainment', ['entertainment', 'showbiz', 'lifestyle', 'culture', 'film', 'music']],
	['Tech', ['tech', 'technology', 'sci-tech', 'gadget']],
	['International', ['international', 'world', 'asia', 'india', 'global']]
];

export function classifySection(url: string, categories: string[], fallback: Section): Section {
	const haystack = [url, ...categories].join(' ').toLowerCase();
	for (const [section, keywords] of SECTION_KEYWORDS) {
		if (keywords.some((k) => haystack.includes(k))) return section;
	}
	return fallback;
}
