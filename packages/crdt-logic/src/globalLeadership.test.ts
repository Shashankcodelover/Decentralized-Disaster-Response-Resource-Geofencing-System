import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DTNBundleStore,
  DTNBundle,
  findSafestEvacuationRoute,
  calculateEdgeCost,
  correlateVisionDetection,
  BoundingBoxDetection,
  EmergencyGovernor,
  AutomatedSystemAuditor,
} from './index.js';

// ═══════════════════════════════════════════════════════════════
// 1. DELAY-TOLERANT NETWORKING (DTN) BUNDLE PROTOCOL TESTS
// ═══════════════════════════════════════════════════════════════
test('DTN - Store ingests bundle and assumes custody', () => {
  const store = new DTNBundleStore(50);
  const bundle: DTNBundle = {
    bundleId: 'b-100',
    sourceNodeId: 'node-A',
    destinationNodeId: '*',
    creationTimestamp: Date.now(),
    ttlMs: 3600_000,
    hopCount: 0,
    maxHops: 5,
    payloadType: 'SOS_BEACON',
    payload: { trapped: 2 },
  };

  const accepted = store.ingestBundle(bundle, 'carrier-node-1');
  assert.equal(accepted, true);
  assert.equal(store.getStoreCount(), 1);

  const stored = store.getBundle('b-100');
  assert.equal(stored?.hopCount, 1);
  assert.ok(stored?.custodyAcceptedBy?.includes('carrier-node-1'));
});

test('DTN - Store drops expired bundles based on TTL', () => {
  const store = new DTNBundleStore(50);
  const expiredBundle: DTNBundle = {
    bundleId: 'b-expired',
    sourceNodeId: 'node-A',
    destinationNodeId: '*',
    creationTimestamp: Date.now() - 5000,
    ttlMs: 1000, // 1s TTL
    hopCount: 0,
    maxHops: 5,
    payloadType: 'CUSTOM',
    payload: 'old data',
  };

  const accepted = store.ingestBundle(expiredBundle, 'carrier-1');
  assert.equal(accepted, false);
  assert.equal(store.getStoreCount(), 0);
});

test('DTN - Reconciles bundle inventory with peer data mule', () => {
  const store = new DTNBundleStore(50);
  store.ingestBundle({
    bundleId: 'b-1',
    sourceNodeId: 'node-A',
    destinationNodeId: '*',
    creationTimestamp: Date.now(),
    ttlMs: 60000,
    hopCount: 0,
    maxHops: 5,
    payloadType: 'CUSTOM',
    payload: 'data1',
  }, 'local-node');

  // Peer has b-2, needs b-1
  const { bundlesToOffer, neededBundleIds } = store.reconcileWithPeer(['b-2'], 'peer-mule');
  assert.equal(bundlesToOffer.length, 1);
  assert.equal(bundlesToOffer[0].bundleId, 'b-1');
  assert.deepEqual(neededBundleIds, ['b-2']);
});

// ═══════════════════════════════════════════════════════════════
// 2. DYNAMIC RISK-WEIGHTED EVACUATION ROUTER TESTS
// ═══════════════════════════════════════════════════════════════
test('Evacuation Router - Solves safest route avoiding high hazard exposure', () => {
  const nodes = [
    { nodeId: 'n-start', name: 'Start Location', lat: 12.97, lng: 77.59 },
    { nodeId: 'n-shelter-A', name: 'Shelter Alpha (Hazard Free)', lat: 12.98, lng: 77.60, isShelter: true },
    { nodeId: 'n-shelter-B', name: 'Shelter Beta (Hazardous Fire)', lat: 12.96, lng: 77.58, isShelter: true },
  ];

  const edges = [
    {
      edgeId: 'e-clean',
      fromNodeId: 'n-start',
      toNodeId: 'n-shelter-A',
      distanceKm: 2.0,
      damageFactor: 0.0,
      isPassable: true,
      activeHazardExposure: 0.0,
      congestionPenalty: 0.1,
    },
    {
      edgeId: 'e-fire',
      fromNodeId: 'n-start',
      toNodeId: 'n-shelter-B',
      distanceKm: 1.0, // Shorter distance but lethal fire hazard
      damageFactor: 2.0,
      isPassable: true,
      activeHazardExposure: 1.0, // High hazard exposure penalty
      congestionPenalty: 0.9,
    },
  ];

  const plan = findSafestEvacuationRoute('n-start', nodes, edges);
  assert.ok(plan !== null);
  assert.equal(plan?.targetShelter?.nodeId, 'n-shelter-A');
  assert.equal(plan?.safetyScore, 100);
});

test('Evacuation Router - Returns null if all roads are impassable', () => {
  const nodes = [
    { nodeId: 'start', name: 'Origin', lat: 10, lng: 10 },
    { nodeId: 'shelter', name: 'Shelter', lat: 11, lng: 11, isShelter: true },
  ];
  const edges = [
    {
      edgeId: 'e-blocked',
      fromNodeId: 'start',
      toNodeId: 'shelter',
      distanceKm: 1.0,
      damageFactor: 3.0,
      isPassable: false, // Road collapsed
      activeHazardExposure: 1.0,
      congestionPenalty: 1.0,
    },
  ];

  const plan = findSafestEvacuationRoute('start', nodes, edges);
  assert.equal(plan, null);
});

// ═══════════════════════════════════════════════════════════════
// 3. EDGE AI DRONE COMPUTER VISION TESTS
// ═══════════════════════════════════════════════════════════════
test('Drone AI Vision - Matches existing beacon within 40m radius', () => {
  const detection: BoundingBoxDetection = {
    detectionId: 'det-1',
    droneId: 'UAV-1',
    timestamp: Date.now(),
    aiClass: 'survivor_waving',
    confidence: 0.92,
    centroid: [77.5946, 12.9716],
    groundBounds: { minLng: 77.594, minLat: 12.971, maxLng: 77.595, maxLat: 12.972 },
  };

  const knownBeacons = [
    { beaconId: 'beacon-alpha', coordinates: [77.5946, 12.9716] as [number, number], severity: 'HIGH' },
  ];

  const res = correlateVisionDetection(detection, knownBeacons);
  assert.equal(res.actionTaken, 'MATCHED_EXISTING_BEACON');
  assert.equal(res.matchedBeaconId, 'beacon-alpha');
});

test('Drone AI Vision - Triggers new SOS for untracked trapped victim', () => {
  const detection: BoundingBoxDetection = {
    detectionId: 'det-2',
    droneId: 'UAV-2',
    timestamp: Date.now(),
    aiClass: 'trapped_person',
    confidence: 0.88,
    thermalSignatureCelsius: 39.2,
    centroid: [77.65, 12.85],
    groundBounds: { minLng: 77.649, minLat: 12.849, maxLng: 77.651, maxLat: 12.851 },
  };

  const res = correlateVisionDetection(detection, []);
  assert.equal(res.actionTaken, 'NEW_SOS_TRIGGERED');
  assert.equal(res.dispatchUrgency, 'CRITICAL');
});

// ═══════════════════════════════════════════════════════════════
// 4. DECENTRALIZED MULTI-SIG EMERGENCY GOVERNOR TESTS
// ═══════════════════════════════════════════════════════════════
test('Emergency Governor - Requires M-of-N signatures to execute mandate', () => {
  const gov = new EmergencyGovernor([
    { signerId: 'ic-1', agencyName: 'FEMA', publicKeyHex: '04aa', role: 'incident_commander' },
    { signerId: 'fire-1', agencyName: 'Fire Dept', publicKeyHex: '04bb', role: 'fire_marshall' },
  ]);

  const proposal = gov.createProposal(
    'MANDATORY_EVACUATION',
    'Mandatory Evacuation Zone 4',
    'zone-4',
    { curfew: true },
    2 // 2 required signatures
  );

  assert.equal(proposal.isExecuted, false);

  // 1st signature
  const sig1 = gov.signProposal(proposal.proposalId, 'ic-1', 'sig-0x11');
  assert.equal(sig1.success, true);
  assert.equal(sig1.executed, false);

  // 2nd signature achieves quorum
  const sig2 = gov.signProposal(proposal.proposalId, 'fire-1', 'sig-0x22');
  assert.equal(sig2.success, true);
  assert.equal(sig2.executed, true);

  const finalProposal = gov.getProposal(proposal.proposalId);
  assert.equal(finalProposal?.isExecuted, true);
});

// ═══════════════════════════════════════════════════════════════
// 5. AUTOMATED SYSTEM AUDITOR & BENCHMARK TESTS
// ═══════════════════════════════════════════════════════════════
test('System Auditor - Computes empirical scores and rejects deficient systems', () => {
  const failingAudit = AutomatedSystemAuditor.runAudit({
    totalUnitTests: 10,
    passedTests: 4,
    failedTests: 6,
    hasAtakCot: false,
    hasStartTriage: false,
    hasDtnProtocol: false,
    hasDroneVision: false,
    hasEmergencyGovernor: false,
    hasLoRaCodec: false,
    hasZeroTrustSocketAuth: false,
    hasIdorProtection: false,
    hasSunlightTheme: false,
    hasOfflineIndexedDb: false,
    hasCompensatingRollbacks: false,
  });

  assert.equal(failingAudit.verdict, 'REJECTED');
  assert.ok(failingAudit.overallScore < 5.0);
  assert.ok(failingAudit.categories.testing.findings.length > 0);
});

test('System Auditor - Accepts fully verified production-grade systems', () => {
  const passingAudit = AutomatedSystemAuditor.runAudit({
    totalUnitTests: 68,
    passedTests: 68,
    failedTests: 0,
    hasAtakCot: true,
    hasStartTriage: true,
    hasDtnProtocol: true,
    hasDroneVision: true,
    hasEmergencyGovernor: true,
    hasLoRaCodec: true,
    hasZeroTrustSocketAuth: true,
    hasIdorProtection: true,
    hasSunlightTheme: true,
    hasOfflineIndexedDb: true,
    hasCompensatingRollbacks: true,
  });

  assert.equal(passingAudit.verdict, 'ACCEPTED');
  assert.equal(passingAudit.overallScore, 10.0);
  assert.equal(passingAudit.categories.security.score, 10.0);
  assert.equal(passingAudit.categories.testing.score, 10.0);
});

