// The collector: fetches configured outlets and publishes one run behind the
// index (ADR-0004). Node-only — never imported by the client (ADR-0002).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Parser from 'rss-parser';
import { articleId } from './id.ts';
import { extractArticle, MAX_EXCERPT_CHARS } from './extract.ts';
import { classifySection } from './section.ts';
import { loadSeenIds, saveSeenIds } from './dedupe.ts';
import { orderByWeight } from './weight.ts';
import { SOURCES, type Source } from './sources.ts';
import type { Article, Index, Run } from '../src/lib/data/schema.ts';

const OUT_DIR = path.join(import.meta.dirname, '../static/data');
const INDEX_PATH = path.join(OUT_DIR, 'index.json');
const RUNS_DIR = path.join(OUT_DIR, 'runs');

const parser = new Parser();

function trimToExcerpt(text: string): string {
	return text.length <= MAX_EXCERPT_CHARS ? text : text.slice(0, MAX_EXCERPT_CHARS) + '\u2026';
}

async function collectSource(source: Source, runId: string): Promise<Article[]> {
	const feed = await parser.parseURL(source.feedUrl);

	const items = feed.items.filter((item) => item.link && item.title);
	const articles = await Promise.all(
		items.map(async (item): Promise<Article | undefined> => {
			// Any failure here (bad URL, bad markup, ...) is one malformed entry,
			// skipped without discarding the valid entries around it.
			try {
				const id = articleId(item.link!);
				const extracted = await extractArticle(item.link!);
				const fallback = item.contentSnippet ?? item.content ?? '';
				const body = extracted?.body ?? fallback;
				const excerpt = extracted?.excerpt ?? trimToExcerpt(fallback);
				if (!body) return undefined; // nothing readable at all

				return {
					id,
					headline: item.title!,
					excerpt,
					body,
					section: classifySection(item.link!, item.categories ?? [], source.defaultSection),
					url: item.link!,
					source: source.name,
					publishedAt: item.isoDate ?? new Date().toISOString(),
					runId
				};
			} catch {
				return undefined;
			}
		})
	);

	return articles.filter((a) => a !== undefined);
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

	let articles: Article[] = [];
	for (const [i, result] of results.entries()) {
		if (result.status === 'fulfilled') articles.push(...result.value);
		// One outlet failing, timing out or erroring must not fail the run.
		else console.error(`collector: ${sources[i].name} failed:`, result.reason);
	}

	const seen = await loadSeenIds();
	articles = articles.filter((a) => !seen.has(a.id));
	articles = orderByWeight(articles, sources);

	const run: Run = { id: runId, generatedAt: new Date().toISOString(), articles };

	await mkdir(RUNS_DIR, { recursive: true });
	await writeFile(path.join(RUNS_DIR, `${runId}.json`), JSON.stringify(run));

	const index = await readIndex();
	index.runs = [{ id: runId, publishedAt: run.generatedAt }, ...index.runs].sort((a, b) =>
		b.publishedAt.localeCompare(a.publishedAt)
	);
	await writeFile(INDEX_PATH, JSON.stringify(index, null, '\t'));

	// ponytail: state is saved after the run/index are written, not atomically
	// with them. A crash in between means the next run may re-collect and
	// re-publish this run's articles as "new" — a visible, harmless duplicate
	// (ADR-0007), not data loss.
	for (const a of articles) seen.add(a.id);
	await saveSeenIds(seen);

	return run;
}

if (import.meta.filename === process.argv[1]) {
	const run = await collect();
	console.log(`collected ${run.articles.length} articles into run ${run.id}`);
}
