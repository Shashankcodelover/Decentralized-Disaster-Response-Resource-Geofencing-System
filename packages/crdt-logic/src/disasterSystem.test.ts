import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDistanceKm, anonymizeCoordinates, isWithinGeofence } from './geofenceEngine.js';
import { computePriorityScore, sortBeaconsByPriority, EmergencyBeacon } from './beaconProtocol.js';

test('calculateDistanceKm returns accurate distance between two GPS coordinates', () => {
  // Bangalore center to Whitefield (~15km)
  const dist = calculateDistanceKm(12.9716, 77.5946, 12.9698, 77.7499);
  assert.ok(dist > 14 && dist < 18, `Distance was ${dist}`);
});

test('anonymizeCoordinates blurs precise GPS location into grid buckets', () => {
  const anon = anonymizeCoordinates(12.971593, 77.594562, 0.001);
  assert.equal(anon.blurredLat, 12.972);
  assert.equal(anon.blurredLng, 77.595);
});

test('isWithinGeofence identifies victim inside zone boundary', () => {
  const zone = {
    zoneId: 'z1',
    name: 'Flood Shelter Alpha',
    centerLat: 12.9716,
    centerLng: 77.5946,
    radiusKm: 5,
    allocatedSupplies: { waterLiters: 1000, foodKits: 500, firstAidKits: 200 }
  };
  
  const victimIn = { userId: 'v1', exactLat: 12.9750, exactLng: 77.5980 };
  const victimOut = { userId: 'v2', exactLat: 13.1000, exactLng: 78.0000 };

  assert.equal(isWithinGeofence(victimIn, zone), true);
  assert.equal(isWithinGeofence(victimOut, zone), false);
});

test('computePriorityScore ranks CRITICAL and low-battery beacons highest', () => {
  const b1: EmergencyBeacon = {
    beaconId: 'b1',
    timestamp: Date.now(),
    blurredLat: 12.97,
    blurredLng: 77.59,
    distressSeverity: 'CRITICAL',
    batteryLevelPercent: 10,
    payload: 'Trapped under debris'
  };

  const b2: EmergencyBeacon = {
    beaconId: 'b2',
    timestamp: Date.now(),
    blurredLat: 12.97,
    blurredLng: 77.59,
    distressSeverity: 'LOW',
    batteryLevelPercent: 90,
    payload: 'Need general info'
  };

  const score1 = computePriorityScore(b1);
  const score2 = computePriorityScore(b2);

  assert.ok(score1 > score2);
  const sorted = sortBeaconsByPriority([b2, b1]);
  assert.equal(sorted[0].beaconId, 'b1');
});
