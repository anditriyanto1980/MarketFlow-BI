/**
 * Calculates deterministic SHA-256 hex string from raw ArrayBuffer
 */
export async function calculateFileSha256(buffer: ArrayBuffer): Promise<string> {
  console.log('[IMPORT] hash-start');
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('File kosong atau tidak dapat dibaca.');
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  console.log(`[IMPORT] hash-complete: ${hashHex}`);
  return hashHex;
}
