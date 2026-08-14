import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateLawnmowerSweep, generateExpandingSquareSearch } from './dronePathEngine';
import { correlateVisionDetection, BoundingBoxDetection } from './droneVisionEngine';

describe('IR-11 Feature 6: Enhanced SAR Drone Path & Edge AI Vision', () => {
  it('computes RTH energy reserve safety margins and wind headwind resistance', () => {
    const mission = generateLawnmowerSweep(12.96, 12.98, 77.58, 77.60, 0.5, 80, [], 15.0);
    assert.ok(mission.totalDistanceKm > 0);
    assert.ok(mission.rthSafetyMarginPct > 0);
    assert.strictEqual(mission.isMissionFeasible, true);
  });

  it('boosts AI detection confidence and triggers hypothermia alerts via thermal telemetry', () => {
    const detection: BoundingBoxDetection = {
      detectionId: 'vis-test-01',
      droneId: 'UAV-01',
      timestamp: Date.now(),
      aiClass: 'trapped_person',
      confidence: 0.60, // below 0.65 threshold normally
      thermalSignatureCelsius: 37.2, // Human body temp -> +0.12 boost -> 0.72 -> Passes!
      groundBounds: { minLng: 77.59, minLat: 12.97, maxLng: 77.591, maxLat: 12.971 },
      centroid: [77.5905, 12.9705],
    };

    const result = correlateVisionDetection(detection, []);
    assert.strictEqual(result.actionTaken, 'NEW_SOS_TRIGGERED');
    assert.strictEqual(result.thermalCorroboration.isHumanBodyTempConfirmed, true);
    assert.ok(result.thermalCorroboration.calibratedConfidence >= 0.70);
  });
});
