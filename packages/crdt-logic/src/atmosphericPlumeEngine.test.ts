import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AtmosphericPlumeEngine } from './atmosphericPlumeEngine';

describe('Hazard Modeling: Atmospheric Gaussian Plume Dispersion Engine', () => {
  const engine = new AtmosphericPlumeEngine();

  it('computes realistic ground-level concentrations and decreases with downwind distance', () => {
    const concNear = engine.calculateGroundConcentrationMgM3(0.5, 0, 500, 4.0, 10, 'D');
    const concFar = engine.calculateGroundConcentrationMgM3(3.0, 0, 500, 4.0, 10, 'D');

    assert.ok(concNear > 0, 'Concentration near source must be positive');
    assert.ok(concNear > concFar, 'Concentration must attenuate with distance');
  });

  it('simulates 3-tier hazard contour polygons and assigns safe upwind ingress bearing', () => {
    const simulation = engine.simulatePlume({
      sourceId: 'chem-leak-01',
      contaminantName: 'CHLORINE_GAS',
      releaseRateGramsPerSec: 800, // Heavy industrial leak
      effectiveHeightMeters: 15,
      originCoordinates: [77.5946, 12.9716],
      windSpeedMps: 3.5,
      windBearingDegrees: 270, // Wind from West blowing East (toBearing = 90)
      stabilityClass: 'C',
    });

    assert.strictEqual(simulation.sourceId, 'chem-leak-01');
    assert.strictEqual(simulation.contours.length, 3);
    // Red lethal contour must be smaller than Yellow caution contour
    assert.ok(simulation.contours[0].maxDownwindDistanceKm <= simulation.contours[2].maxDownwindDistanceKm);
    // Safe ingress bearing should be approaching from upwind (West / 270 deg)
    assert.strictEqual(simulation.safeResponderIngressBearingDeg, 270);
    assert.ok(simulation.contours[0].boundaryPolygon.length > 5);
  });
});
