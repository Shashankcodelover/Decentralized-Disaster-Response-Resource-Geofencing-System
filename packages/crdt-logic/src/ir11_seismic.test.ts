import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SeismicEarlyWarningEngine, SeismicSensorStation } from './seismicEarlyWarningEngine';

describe('IR-11 Feature 9: Enhanced Seismic EEW & Soil Amplification', () => {
  const eew = new SeismicEarlyWarningEngine();

  it('calculates soil amplification factors and Omori-Utsu aftershock probabilities', () => {
    const stations: SeismicSensorStation[] = [
      { stationId: 'ST-1', locationCoordinates: [77.59, 12.97], elevationMeters: 920, staLtaRatio: 5.8, pWaveArrivalTimestampMs: Date.now(), peakGroundAccelerationG: 0.35, siteSoilClass: 'C_DENSE_SOIL' },
      { stationId: 'ST-2', locationCoordinates: [77.63, 12.94], elevationMeters: 910, staLtaRatio: 6.2, pWaveArrivalTimestampMs: Date.now() + 500, peakGroundAccelerationG: 0.40, siteSoilClass: 'D_STIFF_SOIL' },
    ];

    const warning = eew.evaluateSeismicEvent(stations);
    assert.ok(warning !== null);
    assert.ok(warning.estimatedMagnitudeMw >= 5.5);
    assert.ok(warning.aftershockProbability72hPct > 30);
    assert.strictEqual(warning.targetCitiesCountdown.length, 3);
    assert.ok(warning.targetCitiesCountdown[1].soilAmplificationFactor >= 2.0); // Soft clay amplification
  });
});
