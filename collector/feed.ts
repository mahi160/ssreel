// The published RSS feed: one item per article, full body included, for
// KOReader's NewsDownloader to build e-ink EPUBs without refetching from
// publishers (ADR-0003).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Article, Index, Run } from '../src/lib/data/schema.ts';
import { WINDOW_DAYS } from '../src/lib/data/window.ts';

const DATA_DIR = path.join(import.meta.dirname, '../static/data');
const FEED_PATH = path.join(import.meta.dirname, '../static/feed.xml');

// ponytail: no custom domain yet. Override with SITE_URL once one exists.
const SITE_URL = process.env.SITE_URL ?? 'https://ssreel.pages.dev';

export function escapeXml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** CDATA-wraps text so arbitrary characters never need per-entity escaping. */
export function cdata(s: string): string {
	return `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

export function itemXml(a: Article): string {
	return [
		'\t<item>',
		`\t\t<title>${escapeXml(a.headline)}</title>`,
		`\t\t<link>${escapeXml(a.url)}</link>`,
		`\t\t<guid isPermaLink="false">${escapeXml(a.id)}</guid>`,
		`\t\t<pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>`,
		`\t\t<description>${cdata(a.excerpt)}</description>`,
		`\t\t<content:encoded>${cdata(a.body)}</content:encoded>`,
		'\t</item>'
	].join('\n');
}

export function feedXml(articles: Article[]): string {
	const newestFirst = [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
		'<channel>',
		'\t<title>ssreel</title>',
		`\t<link>${SITE_URL}</link>`,
		'\t<description>Curated news, full text for e-ink readers</description>',
		...newestFirst.map(itemXml),
		'</channel>',
		'</rss>',
		''
	].join('\n');
}

/** Rebuilds the feed from every currently-published run within the window. */
export async function publishFeed(): Promise<void> {
	let index: Index;
	try {
		index = JSON.parse(await readFile(path.join(DATA_DIR, 'index.json'), 'utf-8'));
	} catch {
		index = { runs: [] };
	}
	const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
	const runIds = index.runs.filter((r) => r.publishedAt >= cutoff).map((r) => r.id);

	const articles: Article[] = [];
	for (const id of runIds) {
		try {
			const run: Run = JSON.parse(
				await readFile(path.join(DATA_DIR, 'runs', `${id}.json`), 'utf-8')
			);
			articles.push(...run.articles);
		} catch {
			// A missing or unreadable run file shouldn't take down the whole feed.
		}
	}

	await writeFile(FEED_PATH, feedXml(articles));
}

if (import.meta.filename === process.argv[1]) await publishFeed();
