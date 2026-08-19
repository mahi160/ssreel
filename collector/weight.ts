// Orders a run's articles by story importance: the summed weight of every
// outlet covering that story, so one major outlet's exclusive can outrank
// several small outlets echoing each other (see CONTEXT.md — Weight).
import type { Article } from '../src/lib/data/schema.ts';
import type { Source } from './sources.ts';

// ponytail: a "story" here is an exact-normalised-headline match — catches
// wire-service reprints, not paraphrased coverage. Real cross-outlet story
// clustering (fuzzy title match or embeddings) is future work if that proves
// too narrow in practice.
function storyKey(headline: string): string {
	return headline
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function orderByWeight(articles: Article[], sources: Source[]): Article[] {
	const weightBySource = new Map(sources.map((s) => [s.name, s.weight]));

	const storyWeight = new Map<string, number>();
	for (const article of articles) {
		const key = storyKey(article.headline);
		const weight = weightBySource.get(article.source) ?? 0;
		storyWeight.set(key, (storyWeight.get(key) ?? 0) + weight);
	}

	return [...articles].sort(
		(a, b) =>
			(storyWeight.get(storyKey(b.headline)) ?? 0) - (storyWeight.get(storyKey(a.headline)) ?? 0)
	);
}
