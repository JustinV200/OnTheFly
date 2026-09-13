/* Downloads the brain file at low priority and returns its decompressed bytes, reporting download progress.
   Runs inside the simulation worker, so a 22 MB download and its decompression never touch the page's main thread. */

const GZIP_FIRST_BYTE = 0x1f;
const GZIP_SECOND_BYTE = 0x8b;

/** Fetch url and return the brain file's bytes, decompressing only if the body is still gzip. */
export async function fetchBrainFile(url: string, onProgress: (loadedBytes: number, totalBytes: number | null) => void): Promise<Uint8Array> {
  // priority is a hint (Chromium honours it); the app's own API requests should always win the network.
  const response = await fetch(url, { priority: 'low' } as RequestInit);
  if (!response.ok || response.body === null) {
    throw new Error(`The brain data file could not be downloaded (HTTP ${response.status}).`);
  }
  const lengthHeader = response.headers.get('Content-Length');
  // A host that compresses on the fly reports the compressed length or none, so progress is approximate.
  const totalBytes = lengthHeader === null ? null : Number(lengthHeader);

  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    loadedBytes += value.byteLength;
    onProgress(loadedBytes, totalBytes);
  }
  const body = concatenate(chunks, loadedBytes);

  // Some hosts send .gz files with Content-Encoding: gzip, in which case the browser has already decompressed them.
  if (body[0] !== GZIP_FIRST_BYTE || body[1] !== GZIP_SECOND_BYTE) {
    return body;
  }
  const decompressed = new Blob([body]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(decompressed).arrayBuffer());
}

// Typed as backed by a plain ArrayBuffer (not a SharedArrayBuffer), which is what Blob accepts.
function concatenate(chunks: Uint8Array[], totalBytes: number): Uint8Array<ArrayBuffer> {
  const joined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}
