import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCoTTypeForEntity, serializeCoTToXml, parseCoTFromXml, CoTEvent } from './cotProtocol';

describe('IR-11 Feature 3: Enhanced ATAK CoT XML Protocol & Symbology', () => {
  it('maps specific hazard and medical emergency types accurately', () => {
    assert.strictEqual(getCoTTypeForEntity('victim_red'), 'b-r-v-m');
    assert.strictEqual(getCoTTypeForEntity('victim_yellow'), 'b-r-v-d');
    assert.strictEqual(getCoTTypeForEntity('hazard_plume'), 'u-d-z-c');
    assert.strictEqual(getCoTTypeForEntity('drone_quad'), 'a-f-A-M-F-Q');
    assert.strictEqual(getCoTTypeForEntity('drone'), 'a-f-A-M-F');
  });


  it('serializes and parses CoT XML events with sensor gimbal payload', () => {
    const event: CoTEvent = {
      uid: 'uav-gimbal-01',
      type: 'a-f-A-M-F-Q',
      how: 'm-g',
      time: '2026-08-14T12:00:00Z',
      start: '2026-08-14T12:00:00Z',
      stale: '2026-08-14T12:05:00Z',
      point: { lat: 12.9716, lon: 77.5946, hae: 120.5, ce: 5.0, le: 3.0 },
      callsign: 'DRONE_RECON_ALPHA',
      sensor: { fovDegrees: 75.0, rangeMeters: 2200, azimuthDegrees: 135.0 },
    };

    const xml = serializeCoTToXml(event);
    assert.ok(xml.includes('<sensor fov="75" range="2200" azimuth="135"/>'));
    assert.ok(xml.includes('callsign="DRONE_RECON_ALPHA"'));

    const parsed = parseCoTFromXml(xml);
    assert.ok(parsed !== null);
    assert.strictEqual(parsed.uid, 'uav-gimbal-01');
    assert.strictEqual(parsed.callsign, 'DRONE_RECON_ALPHA');
    assert.strictEqual(parsed.sensor?.fovDegrees, 75.0);
    assert.strictEqual(parsed.sensor?.rangeMeters, 2200);
  });
});
