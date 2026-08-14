import test from 'node:test';
import assert from 'node:assert/strict';
import { DTNEpidemicRouter, DTNBundle } from './dtnEpidemicRouter';

test('Grand Finale Stage 1: DTNEpidemicRouter prioritizes CRITICAL bundles and manages storage evictions', () => {
    const router = new DTNEpidemicRouter(1000); // 1000 bytes max capacity
    const time = Date.now();

    const b1: DTNBundle = {
        bundleId: 'B1',
        sourceNode: 'NODE_A',
        destinationNode: 'HQ',
        priority: 'ROUTINE_TELEMETRY',
        payloadBytes: 600,
        payloadData: 'battery=80%',
        creationTimestamp: time,
        ttlSeconds: 3600,
        hopCount: 0,
        visitedNodes: ['NODE_A'],
    };

    const b2: DTNBundle = {
        bundleId: 'B2',
        sourceNode: 'NODE_B',
        destinationNode: 'HQ',
        priority: 'CRITICAL_SOS',
        payloadBytes: 600, // Exceeds remaining 400 bytes -> must evict B1
        payloadData: 'TRAPPED_SURVIVORS_COUNT=4',
        creationTimestamp: time,
        ttlSeconds: 3600,
        hopCount: 0,
        visitedNodes: ['NODE_B'],
    };

    const r1 = router.ingestBundle(b1, time);
    assert.equal(r1.accepted, true);

    const r2 = router.ingestBundle(b2, time);
    assert.equal(r2.accepted, true);

    const stats = router.getStats();
    assert.equal(stats.storedBundlesCount, 1);
    assert.equal(stats.currentStorageBytes, 600); // B1 was evicted, B2 retained
});

test('Grand Finale Stage 1: DTNEpidemicRouter reconciles anti-entropy exchange and processes ACKs', () => {
    const router = new DTNEpidemicRouter(100000);
    const time = Date.now();

    const b1: DTNBundle = {
        bundleId: 'B_MED',
        sourceNode: 'CLINIC_1',
        destinationNode: 'HOSPITAL',
        priority: 'URGENT_MEDICAL',
        payloadBytes: 200,
        payloadData: 'BLOOD_O_NEG_REQUIRED',
        creationTimestamp: time,
        ttlSeconds: 3600,
        hopCount: 0,
        visitedNodes: ['CLINIC_1'],
    };

    router.ingestBundle(b1, time);

    // Peer connects with empty store
    const toSend = router.reconcileWithPeer('empty_vector', []);
    assert.equal(toSend.length, 1);
    assert.equal(toSend[0].bundleId, 'B_MED');
    assert.equal(toSend[0].hopCount, 1);

    // Acknowledge delivery
    router.acknowledgeDelivery('B_MED');
    assert.equal(router.getStats().storedBundlesCount, 0);
});
