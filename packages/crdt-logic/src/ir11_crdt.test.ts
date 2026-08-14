import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VectorClock, compressDeltaRLE, decompressDeltaRLE, encodeUpdate, decodeUpdate } from './helpers';

describe('IR-11 Feature 11: Enhanced CRDT Vector Clock & Delta Compression', () => {
  it('tracks causal ordering across distributed nodes accurately', () => {
    const vc1 = new VectorClock({ 'node-a': 2, 'node-b': 1 });
    const vc2 = new VectorClock({ 'node-a': 2, 'node-b': 2 });

    assert.strictEqual(vc1.compare(vc2.toJSON()), 'BEFORE');
    assert.strictEqual(vc2.compare(vc1.toJSON()), 'AFTER');

    // Concurrent mutation check
    const vc3 = new VectorClock({ 'node-a': 3, 'node-b': 1 });
    assert.strictEqual(vc2.compare(vc3.toJSON()), 'CONCURRENT');

    // Merge vector clocks
    vc2.merge(vc3.toJSON());
    assert.strictEqual(vc2.get('node-a'), 3);
    assert.strictEqual(vc2.get('node-b'), 2);
  });

  it('compresses and decompresses repetitive binary CRDT delta buffers losslessly', () => {
    const rawData = new Uint8Array([0x01, 0x01, 0x01, 0x01, 0x01, 0xAA, 0xBB, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const compressed = compressDeltaRLE(rawData);
    assert.ok(compressed.length < rawData.length);

    const decompressed = decompressDeltaRLE(compressed);
    assert.deepStrictEqual(decompressed, rawData);
  });
});
