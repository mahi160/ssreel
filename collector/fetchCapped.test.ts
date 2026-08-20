import { describe, expect, it } from 'vitest';
import { readCapped } from './fetchCapped.ts';

function streamed(...chunks: number[][]) {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
			controller.close();
		}
	});
	return { body: stream } as unknown as Response;
}

describe('readCapped', () => {
	it('returns the concatenated bytes when under the cap', async () => {
		const bytes = await readCapped(streamed([1, 2], [3, 4, 5]), 10);
		expect(new Uint8Array(bytes!)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
	});

	it('returns undefined once the stream exceeds the cap, without buffering past it', async () => {
		const bytes = await readCapped(streamed([1, 2, 3], [4, 5, 6]), 4);
		expect(bytes).toBeUndefined();
	});

	it('falls back to arrayBuffer() when the response has no readable stream body', async () => {
		const small = {
			body: undefined,
			arrayBuffer: async () => new ArrayBuffer(3)
		} as unknown as Response;
		expect((await readCapped(small, 10))?.byteLength).toBe(3);

		const big = {
			body: undefined,
			arrayBuffer: async () => new ArrayBuffer(10)
		} as unknown as Response;
		expect(await readCapped(big, 3)).toBeUndefined();
	});
});
