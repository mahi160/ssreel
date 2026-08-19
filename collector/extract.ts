// Recovering an article's readable body from the publisher's page (ADR-0003).
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const MAX_BODY_CHARS = 4000;
export const MAX_EXCERPT_CHARS = 400;

/** Trims to a max length on a word boundary, never mid-word. */
function trim(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	return cut.slice(0, cut.lastIndexOf(' ')) + '\u2026';
}

export interface Extracted {
	excerpt: string;
	body: string;
}

/** Fetches and extracts an article's body. Returns undefined on any failure — the caller falls back to the feed's own summary. */
export async function extractArticle(url: string): Promise<Extracted | undefined> {
	try {
		const res = await fetch(url, {
			headers: { 'user-agent': 'Mozilla/5.0 (compatible; ssreel-collector/1.0)' },
			signal: AbortSignal.timeout(15_000)
		});
		if (!res.ok) return undefined;
		const html = await res.text();

		// jsdom logs unparsable stylesheets to console by default; publisher pages are noisy.
		const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
		const text = new Readability(dom.window.document)
			.parse()
			?.textContent?.trim()
			.replace(/\s+/g, ' ');
		if (!text) return undefined;

		return { body: trim(text, MAX_BODY_CHARS), excerpt: trim(text, MAX_EXCERPT_CHARS) };
	} catch {
		return undefined;
	}
}
