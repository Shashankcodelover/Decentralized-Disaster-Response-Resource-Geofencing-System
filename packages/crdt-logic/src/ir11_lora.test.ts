import { describe, it } from 'node:test';
import assert from 'node:assert';
import { encodeLoRaPacket, decodeLoRaPacket, calculateTimeOnAir, LoRaTelemetryPacket } from './loraMeshCodec';

describe('IR-11 Feature 4: Enhanced LoRa 24B Mesh Codec & Time-on-Air Physics', () => {
  it('encodes and decodes 24B packet preserving hop count and sensor telemetry', () => {
    const packet: LoRaTelemetryPacket = {
      packetType: 'BEACON',
      priority: 'CRITICAL',
      nodeIdHash: 0xa1b2c3d4,
      lng: 77.5946,
      lat: 12.9716,
      batteryPct: 68,
      triageTag: 'RED',
      sensorValue: 8.5,
      shortMessage: 'TRAPPED',
      hopCount: 3,
    };

    const encoded = encodeLoRaPacket(packet);
    assert.strictEqual(encoded.length, 24);

    const decoded = decodeLoRaPacket(encoded);
    assert.ok(decoded !== null);
    assert.strictEqual(decoded.packetType, 'BEACON');

    assert.strictEqual(decoded.priority, 'CRITICAL');
    assert.strictEqual(decoded.triageTag, 'RED');
    assert.strictEqual(decoded.hopCount, 3);
    assert.strictEqual(decoded.shortMessage, 'TRAPPED');
  });

  it('computes accurate SX1262 Time-on-Air (ToA) airtime metrics', () => {
    const toaSF7 = calculateTimeOnAir(24, 7, 125, '4/5');
    const toaSF12 = calculateTimeOnAir(24, 12, 125, '4/5');

    assert.ok(toaSF7.timeOnAirMs > 30 && toaSF7.timeOnAirMs < 100);
    assert.ok(toaSF12.timeOnAirMs > 800); // SF12 airtime is much longer for deep penetration
    assert.ok(toaSF12.maxDistanceEstimateKm > toaSF7.maxDistanceEstimateKm);
  });
});
