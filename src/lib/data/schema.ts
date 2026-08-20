// The published data contract (ADR-0004): per-run files behind a small index.
// Shared, type-only, between the collector (Node) and the client — importing
// only types here never pulls collector runtime code into the client bundle.

export type Section = 'Local' | 'International' | 'Entertainment' | 'Tech' | 'Sports';
export const SECTIONS: Section[] = ['Local', 'International', 'Entertainment', 'Tech', 'Sports'];
export type Language = 'en' | 'bn';
export type LanguageFilter = 'mixed' | Language;

export const LANGUAGE_LABEL: Record<LanguageFilter, string> = {
	mixed: 'Mix',
	en: 'English only',
	bn: 'Bangla only'
};

// The reel's color code: every section keeps one accent everywhere it appears
// (card, list, settings), so color alone tells a reader what they're looking at
// or muting. Maps 1:1 onto the theme's --chart-1..5 tokens (src/routes/layout.css).
export const SECTION_ACCENT: Record<Section, string> = {
	Local: 'var(--chart-1)',
	International: 'var(--chart-2)',
	Entertainment: 'var(--chart-3)',
	Tech: 'var(--chart-4)',
	Sports: 'var(--chart-5)'
};

export interface Article {
	id: string;
	headline: string;
	excerpt: string;
	body: string;
	image?: string; // same-origin path, absent if this article has no usable image
	section: Section;
	url: string;
	source: string;
	language?: Language; // optional for articles cached before language filters existed
	publishedAt: string; // ISO 8601
	runId: string;
	/** Position within its run, most important first (ADR — Weight). */
	rank: number;
}

export function articleLanguage(
	article: Pick<Article, 'language' | 'headline' | 'excerpt' | 'body'>
): Language {
	if (article.language) return article.language;
	return /[\u0980-\u09FF]/.test(`${article.headline} ${article.excerpt} ${article.body}`)
		? 'bn'
		: 'en';
}

export interface Run {
	id: string;
	generatedAt: string; // ISO 8601
	articles: Article[];
}

export interface RunSummary {
	id: string;
	publishedAt: string; // ISO 8601
}

export interface Index {
	/** Newest first. */
	runs: RunSummary[];
}
