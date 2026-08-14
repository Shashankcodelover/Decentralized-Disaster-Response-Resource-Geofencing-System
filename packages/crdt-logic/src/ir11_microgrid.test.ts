import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MicrogridEnergyEngine, MicrogridAsset } from './microgridEnergyEngine';

describe('IR-11 Feature 10: Enhanced Microgrid Black-Start & Droop Control', () => {
  const engine = new MicrogridEnergyEngine();

  it('computes f-P droop frequency and tracks automated 4-step black-start recovery', () => {
    const assets: MicrogridAsset[] = [
      { assetId: 'solar', type: 'SOLAR_PV', capacityKw: 30, currentOutputOrDrawKw: 10, priorityTier: 1 },
      { assetId: 'bess', type: 'BESS_BATTERY', capacityKw: 100, currentOutputOrDrawKw: 15, batterySocPercent: 22, priorityTier: 1 },
      { assetId: 'icu', type: 'HOSPITAL_LOAD', capacityKw: 40, currentOutputOrDrawKw: 35, priorityTier: 1 },
      { assetId: 'camp', type: 'BASE_CAMP_LOAD', capacityKw: 25, currentOutputOrDrawKw: 20, priorityTier: 3 },
    ];

    const dispatch = engine.optimizeEnergyDispatch(assets);
    assert.ok(dispatch.systemFrequencyHz <= 50.0); // Droop under deficit
    assert.ok(dispatch.activeLoadSheddingTiers.includes(3));
    assert.strictEqual(dispatch.blackStartSequence.length, 4);
    assert.strictEqual(dispatch.blackStartSequence[0].isCompleted, true);
  });
});
