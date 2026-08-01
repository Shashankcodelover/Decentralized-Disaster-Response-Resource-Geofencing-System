/**
 * CRDT serialization helpers for Yjs state transport.
 * Environment-agnostic: works in both Node.js and browser.
 */

/**
 * Merges multiple Yjs update vectors into a single doc.
 * Consumers inject Y.applyUpdate to avoid double-bundling Yjs.
 */
export function mergeUpdates(
  applyUpdate: (doc: unknown, update: Uint8Array) => void,
  doc: unknown,
  updates: Uint8Array[]
): void {
  for (const update of updates) {
    applyUpdate(doc, update);
  }
}

/** Encode a Uint8Array Yjs update to base64 for JSON transport */
export function encodeUpdate(update: Uint8Array): string {
  if (typeof globalThis !== 'undefined' && 'Buffer' in globalThis) {
    return (globalThis as any).Buffer.from(update).toString('base64');
  }
  // Browser fallback
  return btoa(String.fromCharCode(...update));
}

/** Decode a base64 string back to Uint8Array */
export function decodeUpdate(encoded: string): Uint8Array {
  if (typeof globalThis !== 'undefined' && 'Buffer' in globalThis) {
    return new Uint8Array((globalThis as any).Buffer.from(encoded, 'base64'));
  }
  return new Uint8Array(
    atob(encoded)
      .split('')
      .map((c) => c.charCodeAt(0))
  );
}
