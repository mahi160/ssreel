// Configured outlets. One entry for the ticket-01 tracer; ticket 03 fills this out.
export interface Source {
	name: string;
	feedUrl: string;
	/** Authority this outlet carries, summed across outlets covering the same story. */
	weight: number;
}

export const SOURCES: Source[] = [
	{ name: 'Prothom Alo English', feedUrl: 'https://en.prothomalo.com/feed', weight: 3 }
];
