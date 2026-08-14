import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SatelliteSbdCodec } from './satelliteSbdCodec';
import { FloodHydrodynamicEngine } from './floodHydrodynamicEngine';
import { DroneSwarmFlockingEngine } from './droneSwarmFlockingEngine';
import { BiometricVitalsEngine } from './biometricVitalsEngine';
import { SeismicEarlyWarningEngine } from './seismicEarlyWarningEngine';
import { MicrogridEnergyEngine } from './microgridEnergyEngine';
import { ZkpVictimIdentityEngine } from './zkpVictimIdentityEngine';

describe('Milestone V9-V15: Sovereign Disaster Response Platform Super-Engines', () => {
  // V9 Satellite SBD
  it('V9: Encodes, decodes, and computes Doppler shift for Iridium SBD satellite frames', () => {
    const sbd = new SatelliteSbdCodec();
    const frame = sbd.encodeSbdFrame(1042, 'SOS_EMERGENCY', 12.9716, 77.5946, 'FLOODED_IN_SECTOR_7');
    assert.ok(frame.length > 20);

    const decoded = sbd.decodeSbdFrame(frame);
    assert.strictEqual(decoded.isValid, true);
    assert.strictEqual(decoded.momsn, 1042);
    assert.strictEqual(decoded.payloadType, 'SOS_EMERGENCY');
    assert.strictEqual(decoded.payloadText, 'FLOODED_IN_SECTOR_7');

    const doppler = sbd.calculateDopplerShiftHz(1626.5e6, 7200);
    assert.ok(doppler > 30000); // ~39 kHz shift
  });

  // V10 Flood Hydrodynamic Simulator
  it('V10: Simulates Froehlich peak discharge and 2D Saint-Venant downstream wave propagation', () => {
    const flood = new FloodHydrodynamicEngine();
    const result = flood.simulateDamBreach({
      damId: 'dam-krishna-01',
      damName: 'Krishna Valley Reservoir Dam',
      reservoirVolumeM3: 45_000_000,
      breachWidthMeters: 100,
      initialWaterHeadMeters: 40,
      originCoordinates: [77.5946, 12.9716],
      downstreamChannelSlope: 0.002,
      manningsRoughnessCoeff: 0.04,
    });

    assert.ok(result.peakDischargeRateM3s > 5000);
    assert.strictEqual(result.inundationZones.length, 3);
    assert.strictEqual(result.inundationZones[0].severity, 'CATASTROPHIC_TORRENT');
    assert.strictEqual(result.evacuationDirective, 'MANDATORY_HIGH_GROUND_EVACUATION');
  });

  // V11 Swarm Drone Flocking
  it('V11: Computes decentralized Reynolds Boids flocking and collision avoidance adjustments', () => {
    const swarm = new DroneSwarmFlockingEngine();
    const drones = [
      { droneId: 'UAV-1', position: { x: 0, y: 0, z: 50 }, velocity: { vx: 5, vy: 5, vz: 0 }, batteryPct: 90, assignedSectorId: 'SEC_A' },
      { droneId: 'UAV-2', position: { x: 6, y: 4, z: 50 }, velocity: { vx: 4, vy: 6, vz: 0 }, batteryPct: 88, assignedSectorId: 'SEC_A' },
      { droneId: 'UAV-3', position: { x: 80, y: 80, z: 50 }, velocity: { vx: 0, vy: 10, vz: 0 }, batteryPct: 82, assignedSectorId: 'SEC_B' },
    ];

    const vectors = swarm.computeSwarmTrajectories(drones);
    assert.strictEqual(vectors.length, 3);
    assert.strictEqual(vectors[0].isProximityWarning, true); // UAV-1 & UAV-2 are <15m apart!
    assert.strictEqual(vectors[0].proximityWarningTargetId, 'UAV-2');
  });

  // V12 Biometric Vitals
  it('V12: Computes Shock Index, NEWS2 clinical scores, and triggers automated triage escalation', () => {
    const vitalsEngine = new BiometricVitalsEngine();
    const criticalVitals = {
      patientId: 'PT-409',
      heartRateBpm: 135,
      systolicBpMmhg: 82,
      diastolicBpMmhg: 50,
      spO2Percent: 88,
      respiratoryRateBpm: 28,
      bodyTemperatureCelsius: 36.1,
      ecgArrhythmiaDetected: true,
      currentTriageTag: 'GREEN' as const,
      timestamp: Date.now(),
    };

    const evalReport = vitalsEngine.evaluateVitals(criticalVitals);
    assert.ok(evalReport.shockIndex > 1.4); // Severe shock
    assert.ok(evalReport.news2Score >= 10);
    assert.strictEqual(evalReport.recommendedTriageTag, 'RED');
    assert.strictEqual(evalReport.isTagEscalated, true);
  });

  // V13 Seismic EEW
  it('V13: Detects P-waves and provides countdown before destructive S-wave shaking arrives', () => {
    const eew = new SeismicEarlyWarningEngine();
    const stations = [
      { stationId: 'ST-1', locationCoordinates: [77.59, 12.97] as [number, number], elevationMeters: 920, staLtaRatio: 5.8, pWaveArrivalTimestampMs: Date.now(), peakGroundAccelerationG: 0.28 },
      { stationId: 'ST-2', locationCoordinates: [77.62, 12.95] as [number, number], elevationMeters: 910, staLtaRatio: 6.2, pWaveArrivalTimestampMs: Date.now() + 800, peakGroundAccelerationG: 0.32 },
    ];

    const warning = eew.evaluateSeismicEvent(stations);
    assert.ok(warning !== null);
    assert.ok(warning.estimatedMagnitudeMw >= 5.5);
    assert.ok(warning.targetCitiesCountdown.length > 0);
  });

  // V14 Microgrid Black-Start
  it('V14: Optimizes islanded microgrid power and triggers emergency load shedding', () => {
    const microgrid = new MicrogridEnergyEngine();
    const assets = [
      { assetId: 'solar-01', type: 'SOLAR_PV' as const, capacityKw: 30, currentOutputOrDrawKw: 15, priorityTier: 1 as const },
      { assetId: 'bess-01', type: 'BESS_BATTERY' as const, capacityKw: 100, currentOutputOrDrawKw: 20, batterySocPercent: 22, priorityTier: 1 as const },
      { assetId: 'hospital-icu', type: 'HOSPITAL_LOAD' as const, capacityKw: 40, currentOutputOrDrawKw: 35, priorityTier: 1 as const },
      { assetId: 'basecamp-tent', type: 'BASE_CAMP_LOAD' as const, capacityKw: 25, currentOutputOrDrawKw: 20, priorityTier: 3 as const },
    ];

    const dispatch = microgrid.optimizeEnergyDispatch(assets);
    assert.ok(dispatch.activeLoadSheddingTiers.includes(3)); // Tier 3 shed due to low BESS SOC
  });

  // V15 Zero-Knowledge Proof (ZKP) Anonymous Claims
  it('V15: Generates anonymous victim commitments and prevents double-claiming via spent nullifiers', () => {
    const zkp = new ZkpVictimIdentityEngine();
    const victimSecret = 'victim_secret_entropy_99201a';

    const commitment = zkp.generateVictimCommitment(victimSecret, 'DISPLACED_FAMILY');
    assert.ok(commitment.commitmentHash.length > 20);

    const proof = zkp.createSupplyClaimProof(victimSecret, 'WATER_AND_MRE_PACK');

    // 1st redemption: approved
    const claim1 = zkp.verifyAndRedeemClaim(proof);
    assert.strictEqual(claim1.isApproved, true);
    assert.ok(claim1.redemptionToken?.startsWith('CLAIM_TOKEN_'));

    // 2nd redemption with same nullifier: blocked
    const claim2 = zkp.verifyAndRedeemClaim(proof);
    assert.strictEqual(claim2.isApproved, false);
    assert.ok(claim2.rejectionReason?.includes('Double-Claim Blocked'));
  });
});
