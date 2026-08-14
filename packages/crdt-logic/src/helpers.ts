/**
 * CRDT Serialization & Vector Clock Helpers — Industrial Readiness Level 11 (IR-11)
 * 
 * Provides Lamport timestamp causality tracking, Vector Clock partial ordering,
 * and Run-Length CRDT delta compression for low-bandwidth mesh synchronizations.
 */

export type CausalityRelation = 'BEFORE' | 'AFTER' | 'CONCURRENT' | 'IDENTICAL';

export interface VectorClockMap {
  [nodeId: string]: number;
}

export class VectorClock {
  private clock: VectorClockMap = {};

  constructor(initialClock: VectorClockMap = {}) {
    this.clock = { ...initialClock };
  }

  public tick(nodeId: string): number {
    this.clock[nodeId] = (this.clock[nodeId] || 0) + 1;
    return this.clock[nodeId];
  }

  public set(nodeId: string, counter: number): void {
    this.clock[nodeId] = counter;
  }

  public get(nodeId: string): number {
    return this.clock[nodeId] || 0;
  }

  public merge(otherClock: VectorClockMap): void {
    for (const [nodeId, counter] of Object.entries(otherClock)) {
      this.clock[nodeId] = Math.max(this.clock[nodeId] || 0, counter);
    }
  }

  public compare(other: VectorClockMap): CausalityRelation {
    const allKeys = Array.from(new Set([...Object.keys(this.clock), ...Object.keys(other)]));
    let hasGreater = false;
    let hasLesser = false;

    for (const key of allKeys) {
      const v1 = this.clock[key] || 0;
      const v2 = other[key] || 0;
      if (v1 > v2) hasGreater = true;
      if (v1 < v2) hasLesser = true;
    }

    if (hasGreater && !hasLesser) return 'AFTER';
    if (!hasGreater && hasLesser) return 'BEFORE';
    if (!hasGreater && !hasLesser) return 'IDENTICAL';
    return 'CONCURRENT';
  }

  public toJSON(): VectorClockMap {
    return { ...this.clock };
  }
}

/**
 * Merges multiple Yjs update vectors into a single doc.
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

/**
 * Compresses repetitive byte runs in binary CRDT deltas (Run-Length Encoding).
 */
export function compressDeltaRLE(data: Uint8Array): Uint8Array {
  const result: number[] = [];
  let i = 0;
  while (i < data.length) {
    const byte = data[i];
    let run = 1;
    while (i + 1 < data.length && data[i + 1] === byte && run < 255) {
      run++;
      i++;
    }
    if (run > 3) {
      result.push(0xfe, run, byte); // Escape marker
    } else {
      for (let j = 0; j < run; j++) {
        if (byte === 0xfe) result.push(0xfe, 0x01, 0xfe);
        else result.push(byte);
      }
    }
    i++;
  }
  return new Uint8Array(result);
}

/**
 * Decompresses Run-Length Encoded binary CRDT deltas.
 */
export function decompressDeltaRLE(compressed: Uint8Array): Uint8Array {
  const result: number[] = [];
  let i = 0;
  while (i < compressed.length) {
    if (compressed[i] === 0xfe && i + 2 < compressed.length) {
      const run = compressed[i + 1];
      const byte = compressed[i + 2];
      for (let j = 0; j < run; j++) {
        result.push(byte);
      }
      i += 3;
    } else {
      result.push(compressed[i]);
      i++;
    }
  }
  return new Uint8Array(result);
}
