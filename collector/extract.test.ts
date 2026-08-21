import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractArticle } from './extract.ts';

const PARAGRAPH =
	'গত কয়েক বছরে স্বাস্থ্য সচেতন মানুষদের মাঝে কিটো ডায়েট, অ্যাটকিনস ডায়েট বা হাই-প্রোটিন ক্রেজের মতো নানা ডায়েটের ট্রেন্ড আমরা দেখেছি। '.repeat(
		6
	);

function htmlResponse(body: string) {
	return {
		ok: true,
		body: undefined, // forces readCapped's non-streaming arrayBuffer() fallback
		arrayBuffer: async () => new TextEncoder().encode(body).buffer
	};
}

function page({
	title = 'প্রতিদিন কতটা ফাইবার খাওয়া জরুরি',
	byline = '<span class="byline">কমল দাস</span>',
	caption = '<figcaption>ছবি: অ্যাডোবি স্টক</figcaption>'
} = {}) {
	return `<!doctype html><html><head><title>${title}</title></head><body>
		<article>
			<h1>${title}</h1>
			${byline}
			<figure><img src="photo.jpg">${caption}</figure>
			<p>${PARAGRAPH}</p>
			<p>${PARAGRAPH}</p>
		</article>
	</body></html>`;
}

afterEach(() => vi.unstubAllGlobals());

describe('extractArticle', () => {
	it('captures the byline as author, and keeps it out of the body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => htmlResponse(page()))
		);
		const result = await extractArticle('https://example.com/a');
		expect(result?.author).toBe('কমল দাস');
		expect(result?.body).not.toContain('কমল দাস');
	});

	it('strips the photo caption/credit out of the body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => htmlResponse(page()))
		);
		const result = await extractArticle('https://example.com/a');
		expect(result?.body).not.toContain('অ্যাডোবি স্টক');
	});

	it('strips a duplicate leading headline from the body', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => htmlResponse(page()))
		);
		const result = await extractArticle('https://example.com/a');
		expect(result?.body.startsWith('প্রতিদিন কতটা ফাইবার খাওয়া জরুরি')).toBe(false);
		expect(result?.body).toContain('গত কয়েক বছরে');
	});

	it('leaves author undefined when the page has no byline', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => htmlResponse(page({ byline: '' })))
		);
		const result = await extractArticle('https://example.com/a');
		expect(result?.author).toBeUndefined();
	});
});
