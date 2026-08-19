// Images are resized at build time and served same-origin (ADR-0005).
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(import.meta.dirname, '../static/images');
const CARD_WIDTH = 800;
const MAX_SOURCE_BYTES = 20_000_000; // a malformed og:image shouldn't stall the build on a huge download

/**
 * Fetches, resizes and re-encodes an image as WebP, named after the article
 * id. Returns the same-origin path to serve it from, or undefined on any
 * failure — a dead or missing image must never fail the build.
 */
export async function processImage(
	imageUrl: string,
	articleId: string
): Promise<string | undefined> {
	try {
		const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
		if (!res.ok) return undefined;
		if (!(res.headers.get('content-type') ?? '').startsWith('image/')) return undefined;
		if (Number(res.headers.get('content-length') ?? 0) > MAX_SOURCE_BYTES) return undefined;
		const bytes = await res.arrayBuffer();
		if (bytes.byteLength > MAX_SOURCE_BYTES) return undefined; // content-length can be absent or lie

		const webp = await sharp(Buffer.from(bytes))
			.resize({ width: CARD_WIDTH, withoutEnlargement: true })
			.webp({ quality: 70 })
			.toBuffer();

		await mkdir(OUT_DIR, { recursive: true });
		await writeFile(path.join(OUT_DIR, `${articleId}.webp`), webp);

		return `/images/${articleId}.webp`;
	} catch {
		return undefined;
	}
}
