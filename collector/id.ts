// Article identity: ADR-0007 — hash of the canonicalised URL.
import { createHash } from 'node:crypto';

// ponytail: fixed list, will need occasional entries as outlets adopt new
// trackers (ADR-0007 consequence) — a duplicate article is the failure mode,
// visible and harmless.
const TRACKING_PARAMS = new Set([
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	'utm_id',
	'fbclid',
	'gclid',
	'gclsrc',
	'dclid',
	'msclkid',
	'mc_cid',
	'mc_eid',
	'ref',
	'ref_src',
	'spm',
	'igshid',
	'_ga',
	'yclid',
	'twclid'
]);

/** Host lowercased, fragment dropped, tracking params stripped, remaining params sorted. */
export function canonicaliseUrl(rawUrl: string): string {
	const url = new URL(rawUrl);
	url.hash = '';
	url.hostname = url.hostname.toLowerCase();

	const kept = [...url.searchParams.entries()]
		.filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
		.sort(([a], [b]) => a.localeCompare(b));
	url.search = '';
	for (const [key, value] of kept) url.searchParams.append(key, value);

	return url.toString();
}

/** Stable, filename-safe article id derived from the article's canonical URL. */
export function articleId(rawUrl: string): string {
	return createHash('sha256').update(canonicaliseUrl(rawUrl)).digest('hex').slice(0, 16);
}
