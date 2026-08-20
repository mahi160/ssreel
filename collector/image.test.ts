import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sharp', () => ({
	default: vi.fn(() => ({
		resize: vi.fn().mockReturnThis(),
		webp: vi.fn().mockReturnThis(),
		toBuffer: vi.fn(async () => Buffer.from('webp-bytes'))
	}))
}));
vi.mock('node:fs/promises', () => ({
	mkdir: vi.fn(async () => undefined),
	writeFile: vi.fn(async () => undefined)
}));

import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { processImage } from './image.ts';

function response(
	overrides: Partial<{
		ok: boolean;
		contentType: string;
		contentLength: string;
		bytes: ArrayBuffer;
	}> = {}
) {
	const {
		ok = true,
		contentType = 'image/webp',
		contentLength,
		bytes = new ArrayBuffer(10)
	} = overrides;
	return {
		ok,
		headers: {
			get: (name: string) =>
				name === 'content-type' ? contentType : name === 'content-length' ? contentLength : null
		},
		arrayBuffer: async () => bytes
	};
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('processImage', () => {
	it('returns undefined when the fetch fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response({ ok: false }))
		);
		expect(await processImage('https://example.com/x.webp', 'id1')).toBeUndefined();
	});

	it('returns undefined for a non-image content-type', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response({ contentType: 'text/html' }))
		);
		expect(await processImage('https://example.com/x.webp', 'id1')).toBeUndefined();
	});

	it('rejects a source the Content-Length header declares oversized', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response({ contentLength: '999999999' }))
		);
		expect(await processImage('https://example.com/x.webp', 'id1')).toBeUndefined();
	});

	it('rejects a source that is actually oversized even when Content-Length lies or is absent', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response({ bytes: new ArrayBuffer(20_000_001) }))
		);
		expect(await processImage('https://example.com/x.webp', 'id1')).toBeUndefined();
	});

	it('resizes, encodes and saves a valid image, returning its same-origin path', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response())
		);
		const path = await processImage('https://example.com/x.jpg', 'abc123');
		expect(path).toBe('/images/abc123.webp');
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringContaining('abc123.webp'),
			expect.any(Buffer)
		);
	});

	it('returns undefined instead of throwing when encoding fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => response())
		);
		vi.mocked(sharp).mockReturnValueOnce({
			resize: vi.fn().mockReturnThis(),
			webp: vi.fn().mockReturnThis(),
			toBuffer: vi.fn(async () => {
				throw new Error('bad image');
			})
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any);
		expect(await processImage('https://example.com/x.jpg', 'id1')).toBeUndefined();
	});
});
