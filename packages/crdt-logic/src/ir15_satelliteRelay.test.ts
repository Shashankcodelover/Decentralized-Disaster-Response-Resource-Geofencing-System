import test from 'node:test';
import assert from 'node:assert/strict';
import { satelliteRelayEngine, EmergencyDistressBeacon } from './satelliteRelayEngine';

test('Grand Finale Stage 2: SatelliteRelayEngine encodes standard 36-char hexadecimal COSPAS-SARSAT frame', () => {
    const beacon: EmergencyDistressBeacon = {
        beaconId: 'BEAC1234',
        countryCodeNumeric: 419, // India
        latitude: 12.3000,
        longitude: 76.6000,
        emergencyNature: 'FLOOD_INUNDATION',
        survivorsCount: 8,
        batteryLevelPct: 75,
    };

    const frame = satelliteRelayEngine.encodeCospasSarsatFrame(beacon);
    assert.equal(frame.length, 36);
    assert.ok(frame.startsWith('FFFE2F'));
    assert.ok(/^[0-9A-F]{36}$/.test(frame));
});

test('Grand Finale Stage 2: SatelliteRelayEngine computes Doppler frequency compensation for LEO orbit pass', () => {
    const doppler = satelliteRelayEngine.calculateDopplerShift(7500, 45); // 7.5 km/s, 45 deg elevation

    assert.equal(doppler.centerFrequencyHz, 406050000);
    assert.ok(doppler.dopplerShiftHz > 5000); // Expect ~7.1 kHz shift
    assert.ok(doppler.tunedUplinkFrequencyHz < doppler.centerFrequencyHz);
    assert.equal(doppler.status, 'DOPPLER_PRE_COMPENSATED_FOR_ORBITAL_PASS');
});
