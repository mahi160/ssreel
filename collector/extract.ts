// Recovering an article's readable body from the publisher's page (ADR-0003).
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { readCapped } from './fetchCapped.ts';

export const MAX_BODY_CHARS = 4000;
export const MAX_EXCERPT_CHARS = 400;
// A publisher page shouldn't be able to stall the build on a huge or
// malformed response — same rationale as image.ts's MAX_SOURCE_BYTES.
const MAX_HTML_BYTES = 5_000_000;

/** Trims to a max length on a word boundary, never mid-word. */
function trim(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	return cut.slice(0, cut.lastIndexOf(' ')) + '\u2026';
}

export interface Extracted {
	excerpt: string;
	body: string;
	imageUrl?: string;
	author?: string;
}

// Publisher pages routinely nest the photo caption/credit inside the same
// element Readability picks as "the article", so it lands in textContent
// glued onto the real body with no separator. Stripped by DOM structure
// (figcaption / caption / credit markers), not by text pattern, so it
// generalises across outlets rather than hard-coding one site's markup.
// The byline is deliberately left alone here — Readability already detects
// and removes it itself (rel="author"/itemprop/class-matched), surfacing it
// as parsed.byline; stripping it first would blind that for outlets with no
// <meta name="author"> fallback.
const NOISE_SELECTOR = 'figcaption, [class*="caption" i], [class*="credit" i]';

/** Strips a leading duplicate of the headline that some outlets embed at the top of the body. */
function stripDuplicateHeadline(text: string, title: string | null | undefined): string {
	if (!title) return text;
	const normalized = title.trim().replace(/\s+/g, ' ');
	if (!normalized || !text.toLowerCase().startsWith(normalized.toLowerCase())) return text;
	return text.slice(normalized.length).trim();
}

/** Fetches and extracts an article's body. Returns undefined on any failure — the caller falls back to the feed's own summary. */
export async function extractArticle(url: string): Promise<Extracted | undefined> {
	try {
		const res = await fetch(url, {
			headers: { 'user-agent': 'Mozilla/5.0 (compatible; ssreel-collector/1.0)' },
			signal: AbortSignal.timeout(15_000)
		});
		if (!res.ok) return undefined;
		const bytes = await readCapped(res, MAX_HTML_BYTES);
		if (!bytes) return undefined;
		const html = new TextDecoder().decode(bytes);

		// jsdom logs unparsable stylesheets to console by default; publisher pages are noisy.
		const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
		const { document } = dom.window;
		for (const el of document.querySelectorAll(NOISE_SELECTOR)) el.remove();

		const parsed = new Readability(document).parse();
		const rawText = parsed?.textContent?.trim().replace(/\s+/g, ' ');
		if (!rawText) return undefined;
		const text = stripDuplicateHeadline(rawText, parsed?.title);
		const author = parsed?.byline?.trim() || undefined;

		const rawImageUrl =
			document.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
			document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
		// Resolved against the article's URL: some publishers use a path, not an absolute URL.
		const imageUrl = rawImageUrl ? new URL(rawImageUrl, url).toString() : undefined;

		return {
			body: trim(text, MAX_BODY_CHARS),
			excerpt: trim(text, MAX_EXCERPT_CHARS),
			imageUrl,
			author
		};
	} catch {
		return undefined;
	}
}
