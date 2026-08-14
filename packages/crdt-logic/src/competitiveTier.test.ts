import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeCoTToXml,
  parseCoTFromXml,
  responderToCoT,
  beaconToCoT,
  getCoTTypeForEntity,
  evaluateSTART,
  summarizeMCI,
  generateLawnmowerSweep,
  generateExpandingSquareSearch,
  encodeLoRaPacket,
  decodeLoRaPacket,
  calculateCRC16,
} from './index.js';

// ═══════════════════════════════════════════════════════════════
// 1. CURSOR ON TARGET (CoT) PROTOCOL TESTS
// ═══════════════════════════════════════════════════════════════
test('CoT - getCoTTypeForEntity returns valid MIL-STD type codes', () => {
  assert.equal(getCoTTypeForEntity('responder'), 'a-f-G-U-C');
  assert.equal(getCoTTypeForEntity('victim'), 'b-r-v');
  assert.equal(getCoTTypeForEntity('drone'), 'a-f-A-M-F');
  assert.equal(getCoTTypeForEntity('danger_zone'), 'u-d-z');
});

test('CoT - serializeCoTToXml and parseCoTFromXml round-trip correctly', () => {
  const original = {
    uid: 'responder-unit-101',
    type: 'a-f-G-U-C',
    how: 'm-g',
    time: '2026-08-10T12:00:00.000Z',
    start: '2026-08-10T12:00:00.000Z',
    stale: '2026-08-10T12:05:00.000Z',
    point: { lat: 12.971593, lon: 77.594562, hae: 15.0, ce: 5.0, le: 5.0 },
    callsign: 'Bravo-Team-Lead',
  };

  const xml = serializeCoTToXml(original);
  assert.ok(xml.includes('<event version="2.0"'));
  assert.ok(xml.includes('uid="responder-unit-101"'));
  assert.ok(xml.includes('lat="12.971593"'));
  assert.ok(xml.includes('callsign="Bravo-Team-Lead"'));

  const parsed = parseCoTFromXml(xml);
  assert.ok(parsed !== null);
  assert.equal(parsed?.uid, 'responder-unit-101');
  assert.equal(parsed?.type, 'a-f-G-U-C');
  assert.equal(parsed?.point.lat, 12.971593);
  assert.equal(parsed?.point.lon, 77.594562);
  assert.equal(parsed?.callsign, 'Bravo-Team-Lead');
});

test('CoT - responderToCoT and beaconToCoT generate valid events', () => {
  const cot1 = responderToCoT({
    id: 'R1',
    name: 'SAR Medic',
    coordinates: [77.5946, 12.9716],
    status: 'active',
  });
  assert.equal(cot1.uid, 'responder-R1');
  assert.equal(cot1.point.lat, 12.9716);
  assert.equal(cot1.point.lon, 77.5946);

  const cot2 = beaconToCoT({
    beaconId: 'B1',
    blurredLat: 12.97,
    blurredLng: 77.59,
    distressSeverity: 'CRITICAL',
    payload: 'Trapped under rubble',
  });
  assert.equal(cot2.uid, 'beacon-B1');
  assert.equal(cot2.type, 'b-r-v');
  assert.equal(cot2.point.ce, 100);
});

// ═══════════════════════════════════════════════════════════════
// 2. MASS CASUALTY INCIDENT (MCI) START TRIAGE TESTS
// ═══════════════════════════════════════════════════════════════
test('MCI Triage - Ambulatory patients are GREEN (Minor)', () => {
  const res = evaluateSTART({
    patientId: 'P1',
    isAbleToWalk: true,
    isBreathing: true,
  });
  assert.equal(res.color, 'GREEN');
  assert.equal(res.priorityLevel, 3);
});

test('MCI Triage - Apneic patients are BLACK (Expectant/Deceased)', () => {
  const res = evaluateSTART({
    patientId: 'P2',
    isAbleToWalk: false,
    isBreathing: false,
  });
  assert.equal(res.color, 'BLACK');
  assert.equal(res.priorityLevel, 0);
});

test('MCI Triage - Severe respiratory rate (>30 bpm) is RED (Immediate)', () => {
  const res = evaluateSTART({
    patientId: 'P3',
    isAbleToWalk: false,
    isBreathing: true,
    respiratoryRatePerMin: 36,
  });
  assert.equal(res.color, 'RED');
  assert.equal(res.priorityLevel, 1);
  assert.ok(res.rationale.includes('Abnormal respiratory rate'));
});

test('MCI Triage - Absent radial pulse / capillary refill > 2s is RED (Immediate)', () => {
  const res = evaluateSTART({
    patientId: 'P4',
    isAbleToWalk: false,
    isBreathing: true,
    respiratoryRatePerMin: 22,
    hasRadialPulse: false,
    capillaryRefillSec: 3.5,
  });
  assert.equal(res.color, 'RED');
  assert.equal(res.priorityLevel, 1);
});

test('MCI Triage - Altered mental status is RED (Immediate)', () => {
  const res = evaluateSTART({
    patientId: 'P5',
    isAbleToWalk: false,
    isBreathing: true,
    respiratoryRatePerMin: 18,
    hasRadialPulse: true,
    followsCommands: false,
  });
  assert.equal(res.color, 'RED');
  assert.equal(res.priorityLevel, 1);
});

test('MCI Triage - Stable non-ambulatory is YELLOW (Delayed)', () => {
  const res = evaluateSTART({
    patientId: 'P6',
    isAbleToWalk: false,
    isBreathing: true,
    respiratoryRatePerMin: 18,
    hasRadialPulse: true,
    followsCommands: true,
  });
  assert.equal(res.color, 'YELLOW');
  assert.equal(res.priorityLevel, 2);
});

test('MCI Triage - summarizeMCI aggregates accurate triage stats', () => {
  const pRed = evaluateSTART({ patientId: 'r1', isAbleToWalk: false, isBreathing: true, respiratoryRatePerMin: 35 });
  const pYel = evaluateSTART({ patientId: 'y1', isAbleToWalk: false, isBreathing: true, respiratoryRatePerMin: 18, hasRadialPulse: true, followsCommands: true });
  const pGrn = evaluateSTART({ patientId: 'g1', isAbleToWalk: true, isBreathing: true });
  const pBlk = evaluateSTART({ patientId: 'b1', isAbleToWalk: false, isBreathing: false });

  const summary = summarizeMCI([pRed, pYel, pGrn, pBlk]);
  assert.equal(summary.counts.RED, 1);
  assert.equal(summary.counts.YELLOW, 1);
  assert.equal(summary.counts.GREEN, 1);
  assert.equal(summary.counts.BLACK, 1);
  assert.equal(summary.counts.total, 4);
  assert.ok(summary.acuityPercentage > 30);
});

// ═══════════════════════════════════════════════════════════════
// 3. AUTONOMOUS SAR DRONE PATH & HAZARD AVOIDANCE TESTS
// ═══════════════════════════════════════════════════════════════
test('Drone SAR - generateLawnmowerSweep generates valid transects and metrics', () => {
  const plan = generateLawnmowerSweep(12.96, 12.98, 77.58, 77.61, 0.5, 80, []);
  assert.equal(plan.pattern, 'lawnmower');
  assert.ok(plan.waypoints.length > 5);
  assert.ok(plan.totalDistanceKm > 0);
  assert.ok(plan.estimatedFlightTimeMinutes > 0);
  assert.ok(plan.coveredAreaSqKm > 0);
  assert.equal(plan.waypoints[0].action, 'takeoff');
  assert.equal(plan.waypoints[plan.waypoints.length - 1].action, 'rtl');
});

test('Drone SAR - Lawnmower detects hazard zone and creates altitude detours', () => {
  const hazardZone = {
    zoneId: 'hz-1',
    hazardType: 'radiation',
    polygon: [
      [77.585, 12.965],
      [77.605, 12.965],
      [77.605, 12.975],
      [77.585, 12.975],
    ] as [number, number][],
  };

  const planWithHazards = generateLawnmowerSweep(12.96, 12.98, 77.58, 77.61, 0.5, 80, [hazardZone]);
  assert.ok(planWithHazards.hazardAvoidanceDetoursCount > 0);
  
  // Detour waypoints have higher altitude
  const detours = planWithHazards.waypoints.filter(w => w.action === 'detour');
  assert.ok(detours.length > 0);
  assert.equal(detours[0].altitudeMeters, 120); // 80 + 40m climb
});

test('Drone SAR - generateExpandingSquareSearch expands outward properly', () => {
  const plan = generateExpandingSquareSearch(12.9716, 77.5946, 0.2, 4, 50);
  assert.equal(plan.pattern, 'expanding_square');
  assert.ok(plan.waypoints.length > 8);
  assert.ok(plan.totalDistanceKm > 0);
});

// ═══════════════════════════════════════════════════════════════
// 4. LoRa 24-BYTE BINARY MESH CODEC & CRC-16 TESTS
// ═══════════════════════════════════════════════════════════════
test('LoRa Codec - encodeLoRaPacket produces exactly 24 bytes', () => {
  const packet = {
    packetType: 'BEACON' as const,
    priority: 'CRITICAL' as const,
    nodeIdHash: 0xa1b2c3d4,
    lng: 77.594562,
    lat: 12.971593,
    batteryPct: 65,
    triageTag: 'RED' as const,
    sensorValue: 8.5,
    shortMessage: 'SOS-MED',
  };

  const encoded = encodeLoRaPacket(packet);
  assert.equal(encoded.byteLength, 24);

  const decoded = decodeLoRaPacket(encoded);
  assert.ok(decoded !== null);
  assert.equal(decoded?.packetType, 'BEACON');
  assert.equal(decoded?.priority, 'CRITICAL');
  assert.equal(decoded?.triageTag, 'RED');
  assert.equal(decoded?.batteryPct, 65);
  assert.equal(decoded?.sensorValue, 8.5);
  assert.equal(decoded?.shortMessage, 'SOS-MED');

  // Verify coordinates precision within 0.0001 deg (<10m)
  assert.ok(Math.abs(decoded!.lat - packet.lat) < 0.0001);
  assert.ok(Math.abs(decoded!.lng - packet.lng) < 0.0001);
});

test('LoRa Codec - Corrupted byte triggers CRC-16 failure and drops packet', () => {
  const packet = {
    packetType: 'RESPONDER_LOC' as const,
    priority: 'PRIORITY' as const,
    nodeIdHash: 0x12345678,
    lng: -122.4194,
    lat: 37.7749,
    batteryPct: 90,
    triageTag: 'NONE' as const,
    sensorValue: 0.0,
    shortMessage: 'LOC-OK',
  };

  const encoded = encodeLoRaPacket(packet);
  assert.ok(decodeLoRaPacket(encoded) !== null);

  // Corrupt 1 byte in the payload
  encoded[8] ^= 0xff;

  // Should fail CRC-16 and return null
  const corruptedResult = decodeLoRaPacket(encoded);
  assert.equal(corruptedResult, null);
});
