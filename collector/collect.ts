// The collector: fetches configured outlets and publishes one run behind the
// index (ADR-0004). Node-only — never imported by the client (ADR-0002).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Parser from 'rss-parser';
import { articleId } from './id.ts';
import { SOURCES, type Source } from './sources.ts';
import type { Article, Index, Run } from '../src/lib/data/schema.ts';

const OUT_DIR = path.join(import.meta.dirname, '../static/data');
const INDEX_PATH = path.join(OUT_DIR, 'index.json');
const RUNS_DIR = path.join(OUT_DIR, 'runs');

const parser = new Parser();

async function collectSource(source: Source, runId: string): Promise<Article[]> {
	const feed = await parser.parseURL(source.feedUrl);
	const articles: Article[] = [];
	for (const item of feed.items) {
		// A malformed entry (no link/title, or an unparsable URL) is skipped, not fatal (ticket 03).
		if (!item.link || !item.title) continue;
		let id: string;
		try {
			id = articleId(item.link);
		} catch {
			continue;
		}
		articles.push({
			id,
			headline: item.title,
			url: item.link,
			source: source.name,
			publishedAt: item.isoDate ?? new Date().toISOString(),
			runId
		});
	}
	return articles;
}

async function readIndex(): Promise<Index> {
	try {
		return JSON.parse(await readFile(INDEX_PATH, 'utf-8'));
	} catch {
		return { runs: [] };
	}
}

export async function collect(sources: Source[] = SOURCES): Promise<Run> {
	const runId = new Date().toISOString().replace(/[:.]/g, '-');
	const results = await Promise.allSettled(sources.map((s) => collectSource(s, runId)));

	const articles: Article[] = [];
	for (const [i, result] of results.entries()) {
		if (result.status === 'fulfilled') articles.push(...result.value);
		// One outlet failing must not fail the run (ticket 03) — logged, not thrown.
		else console.error(`collector: ${sources[i].name} failed:`, result.reason);
	}

	const run: Run = { id: runId, generatedAt: new Date().toISOString(), articles };

	await mkdir(RUNS_DIR, { recursive: true });
	await writeFile(path.join(RUNS_DIR, `${runId}.json`), JSON.stringify(run));

	const index = await readIndex();
	index.runs = [{ id: runId, publishedAt: run.generatedAt }, ...index.runs].sort((a, b) =>
		b.publishedAt.localeCompare(a.publishedAt)
	);
	await writeFile(INDEX_PATH, JSON.stringify(index, null, '\t'));

	return run;
}

if (import.meta.filename === process.argv[1]) {
	const run = await collect();
	console.log(`collected ${run.articles.length} articles into run ${run.id}`);
}
