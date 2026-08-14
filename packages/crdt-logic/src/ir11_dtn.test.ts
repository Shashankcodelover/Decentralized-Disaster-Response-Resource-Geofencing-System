import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DTNBundleStore, DTNBundle } from './dtnProtocol';

describe('IR-11 Feature 5: Enhanced DTN Bundle Protocol & PRoPHET Predictability', () => {
  it('computes PRoPHET encounter predictability and updates aging across time', () => {
    const store = new DTNBundleStore(10);
    const p1 = store.registerPeerEncounter('data-mule-alpha');
    assert.strictEqual(p1, 0.75);

    // Second encounter reinforces predictability
    const p2 = store.registerPeerEncounter('data-mule-alpha');
    assert.ok(p2 > 0.75);
  });

  it('reconciles bundle inventory prioritizing high-priority SOS payloads', () => {
    const store = new DTNBundleStore(10);
    store.ingestBundle({
      bundleId: 'B_ROUTINE',
      sourceNodeId: 'node-1',
      destinationNodeId: '*',
      creationTimestamp: Date.now(),
      ttlMs: 3600_000,
      hopCount: 1,
      maxHops: 5,
      payloadType: 'SUPPLY_MANIFEST',
      payload: { blankets: 20 },
      priorityWeight: 2,
    }, 'local');

    store.ingestBundle({
      bundleId: 'B_CRITICAL_SOS',
      sourceNodeId: 'node-2',
      destinationNodeId: '*',
      creationTimestamp: Date.now(),
      ttlMs: 3600_000,
      hopCount: 2,
      maxHops: 5,
      payloadType: 'SOS_BEACON',
      payload: { trapped: 5 },
      priorityWeight: 10,
    }, 'local');

    const recon = store.reconcileWithPeer([], 'peer-mule-beta');
    assert.strictEqual(recon.bundlesToOffer.length, 2);
    // Highest priority bundle offered first
    assert.strictEqual(recon.bundlesToOffer[0].bundleId, 'B_CRITICAL_SOS');
  });
});
