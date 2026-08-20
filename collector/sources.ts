import type { Language, Section } from '../src/lib/data/schema.ts';

export interface Source {
	name: string;
	feedUrl: string;
	/** Authority this outlet carries, summed across outlets covering the same story. */
	weight: number;
	/** Section for articles this outlet's feed doesn't otherwise categorise. */
	defaultSection: Section;
	language: Language;
}

export const SOURCES: Source[] = [
	// Bangladesh-first. Bangla feeds from ../news; English feeds retained for mix mode.
	{
		name: 'Prothom Alo',
		feedUrl: 'https://www.prothomalo.com/feed',
		weight: 3,
		defaultSection: 'Local',
		language: 'bn'
	},
	{
		name: 'Banglanews24',
		feedUrl: 'https://www.banglanews24.com/rss.xml',
		weight: 2,
		defaultSection: 'Local',
		language: 'bn'
	},
	{
		name: 'BBC Bangla World',
		feedUrl: 'https://feeds.bbci.co.uk/bengali/world/rss.xml',
		weight: 3,
		defaultSection: 'International',
		language: 'bn'
	},
	{
		name: 'BBC Bangla Entertainment',
		feedUrl: 'https://feeds.bbci.co.uk/bengali/topics/entertainment/rss.xml',
		weight: 3,
		defaultSection: 'Entertainment',
		language: 'bn'
	},
	{
		name: 'BBC Bangla Sport',
		feedUrl: 'https://feeds.bbci.co.uk/bengali/sport/rss.xml',
		weight: 3,
		defaultSection: 'Sports',
		language: 'bn'
	},
	{
		name: 'BBC Bangla',
		feedUrl: 'https://feeds.bbci.co.uk/bengali/rss.xml',
		weight: 3,
		defaultSection: 'Local',
		language: 'bn'
	},
	{
		name: 'Prothom Alo English',
		feedUrl: 'https://en.prothomalo.com/feed',
		weight: 3,
		defaultSection: 'Local',
		language: 'en'
	},
	{
		name: 'The Daily Star',
		feedUrl: 'https://www.thedailystar.net/rss.xml',
		weight: 3,
		defaultSection: 'Local',
		language: 'en'
	},
	{
		name: 'Dhaka Tribune',
		feedUrl: 'https://www.dhakatribune.com/feed/rss',
		weight: 2,
		defaultSection: 'Local',
		language: 'en'
	},
	{
		name: 'BBC News World',
		feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
		weight: 5,
		defaultSection: 'International',
		language: 'en'
	},
	{
		name: 'BBC Sport',
		feedUrl: 'https://feeds.bbci.co.uk/sport/rss.xml',
		weight: 4,
		defaultSection: 'Sports',
		language: 'en'
	},
	{
		name: 'ESPN Cricinfo',
		feedUrl: 'https://www.espncricinfo.com/rss/content/story/feeds/6.xml',
		weight: 3,
		defaultSection: 'Sports',
		language: 'en'
	},
	{
		name: 'TechShohor',
		feedUrl: 'https://techshohor.com/feed/',
		weight: 1,
		defaultSection: 'Tech',
		language: 'bn'
	},
	{
		name: 'TechCrunch',
		feedUrl: 'https://techcrunch.com/feed/',
		weight: 2,
		defaultSection: 'Tech',
		language: 'en'
	},
	{
		name: 'Variety',
		feedUrl: 'https://variety.com/feed/',
		weight: 2,
		defaultSection: 'Entertainment',
		language: 'en'
	}
];
