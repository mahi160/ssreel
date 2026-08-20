import { describe, expect, it } from 'vitest';
import { articleLanguage } from './schema.ts';

function article(overrides: Partial<Parameters<typeof articleLanguage>[0]> = {}) {
	return { headline: '', excerpt: '', body: '', ...overrides };
}

describe('articleLanguage', () => {
	it('trusts an explicit language over any sniffing', () => {
		expect(articleLanguage(article({ language: 'en', headline: 'বাংলা' }))).toBe('en');
	});

	it('falls back to detecting Bangla script when language is missing', () => {
		expect(articleLanguage(article({ headline: 'ঢাকায় বৃষ্টি' }))).toBe('bn');
	});

	it('falls back to English when no Bangla script is present', () => {
		expect(articleLanguage(article({ headline: 'Rain in Dhaka' }))).toBe('en');
	});
});
