import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AtmosphericPlumeEngine } from './atmosphericPlumeEngine';

describe('IR-11 Feature 8: Enhanced Atmospheric Plume Dispersion & Briggs Plume Rise', () => {
  const engine = new AtmosphericPlumeEngine();

  it('computes thermal Briggs plume rise and applies NIOSH chemical thresholds', () => {
    const rise = engine.calculateBriggsPlumeRise(3.0, 85, 20, 2.0, 4.0); // Hot stack gas
    assert.ok(rise > 0);

    const simulation = engine.simulatePlume({
      sourceId: 'plume-ir11-01',
      contaminantName: 'CHLORINE_GAS',
      releaseRateGramsPerSec: 500,
      effectiveHeightMeters: 10,
      originCoordinates: [77.5946, 12.9716],
      windSpeedMps: 3.5,
      windBearingDegrees: 270, // West wind blowing East (90 deg)
      stabilityClass: 'D',
      stackGasTempCelsius: 85,
      ambientTempCelsius: 20,
    });

    assert.strictEqual(simulation.contaminantName, 'CHLORINE_GAS');
    assert.ok(simulation.effectiveReleaseHeightMeters > 10);
    assert.strictEqual(simulation.windVector.toBearingDeg, 90);
    assert.strictEqual(simulation.safeResponderIngressBearingDeg, 270);
    assert.strictEqual(simulation.crosswindFlankIngressBearingDeg, 0); // 270 + 90 = 360/0 deg North
    assert.strictEqual(simulation.contours.length, 3);
    assert.strictEqual(simulation.contours[0].thresholdMgM3, 29.0); // NIOSH IDLH for Chlorine
  });
});
