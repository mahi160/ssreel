// Shared by extract.ts (article HTML) and image.ts (og:image bytes): a
// Content-Length header can be missing or lie, so the only real cap is on
// bytes actually read, not on what the header claims — otherwise a huge or
// malformed response is fully buffered in memory before any check runs.
export async function readCapped(
	res: Response,
	maxBytes: number
): Promise<ArrayBuffer | undefined> {
	const reader = res.body?.getReader();
	if (!reader) {
		// No stream support in this fetch implementation — cap after the fact.
		const buf = await res.arrayBuffer();
		return buf.byteLength > maxBytes ? undefined : buf;
	}

	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			return undefined;
		}
		chunks.push(value);
	}

	const out = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return out.buffer;
}
