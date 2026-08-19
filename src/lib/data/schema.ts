// The published data contract (ADR-0004): per-run files behind a small index.
// Shared, type-only, between the collector (Node) and the client — importing
// only types here never pulls collector runtime code into the client bundle.

export type Section = 'Local' | 'International' | 'Entertainment' | 'Tech' | 'Sports';
export const SECTIONS: Section[] = ['Local', 'International', 'Entertainment', 'Tech', 'Sports'];

export interface Article {
	id: string;
	headline: string;
	excerpt: string;
	body: string;
	image?: string; // same-origin path, absent if this article has no usable image
	section: Section;
	url: string;
	source: string;
	publishedAt: string; // ISO 8601
	runId: string;
	/** Position within its run, most important first (ADR — Weight). */
	rank: number;
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
