import type { Section } from '../src/lib/data/schema.ts';

export interface Source {
	name: string;
	feedUrl: string;
	/** Authority this outlet carries, summed across outlets covering the same story. */
	weight: number;
	/** Section for articles this outlet's feed doesn't otherwise categorise. */
	defaultSection: Section;
}

export const SOURCES: Source[] = [
	{
		name: 'Prothom Alo English',
		feedUrl: 'https://en.prothomalo.com/feed',
		weight: 3,
		defaultSection: 'Local'
	},
	{
		name: 'BBC News World',
		feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
		weight: 5,
		defaultSection: 'International'
	},
	{
		name: 'BBC Sport',
		feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml',
		weight: 4,
		defaultSection: 'Sports'
	},
	{
		name: 'TechCrunch',
		feedUrl: 'https://techcrunch.com/feed/',
		weight: 3,
		defaultSection: 'Tech'
	},
	{
		name: 'Variety',
		feedUrl: 'https://variety.com/feed/',
		weight: 2,
		defaultSection: 'Entertainment'
	}
];
