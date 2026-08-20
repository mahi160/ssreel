// Muting is a display filter only (CONTEXT.md — Mute): it never affects what
// gets downloaded or stored, only what's shown in the reel and the list.
import { articleLanguage, type Article } from './schema.ts';
import type { Settings } from './settings.svelte.ts';

export function isMuted(
	article: Article,
	settings: Pick<Settings, 'mutedSections' | 'mutedSources' | 'languageFilter'>
): boolean {
	return (
		settings.mutedSections.includes(article.section) ||
		settings.mutedSources.includes(article.source) ||
		(settings.languageFilter !== 'mixed' && articleLanguage(article) !== settings.languageFilter)
	);
}
