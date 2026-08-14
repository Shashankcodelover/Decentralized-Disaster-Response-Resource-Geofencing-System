import test from 'node:test';
import assert from 'node:assert/strict';
import { waterBiohazardEngine, ChemicalContaminant } from './waterBiohazardEngine';

test('Grand Finale Stage 4: WaterBiohazardEngine solves 1D advection-dispersion chemical plume propagation', () => {
    const chemical: ChemicalContaminant = {
        spillMassKg: 500, // 500 kg toxic spill
        riverCrossSectionAreaM2: 50,
        dispersionCoefficientM2s: 5.0,
        riverVelocityMps: 1.0, // 1 m/s flow
        safeLimitMgL: 0.05,
    };

    // At x = 3600m (3.6 km downstream), after t = 3600s (1 hour), the center of the plume arrives
    const concPeak = waterBiohazardEngine.calculateConcentrationMgL(chemical, 3600, 3600);
    assert.ok(concPeak > 0.5); // Dangerous toxic peak

    // Far ahead of plume (x = 10,000m at t = 3600s), concentration is virtually zero
    const concAhead = waterBiohazardEngine.calculateConcentrationMgL(chemical, 10000, 3600);
    assert.equal(concAhead, 0);
});

test('Grand Finale Stage 4: WaterBiohazardEngine allocates potable water according to WHO Sphere standards (15L/day)', () => {
    const shelters = [
        { shelterId: 'SHELTER_1', population: 200, currentStockLitres: 1000 },
        { shelterId: 'SHELTER_2', population: 400, currentStockLitres: 2000 },
    ];

    const distribution = waterBiohazardEngine.allocateShelterWaterRations(shelters, 18000, 15);
    assert.equal(distribution.totalShelterPopulation, 600);
    assert.equal(distribution.totalDailyDemandLitres, 9000); // 600 * 15L = 9000L/day
    assert.equal(distribution.shelterAllocations[0].allocatedFromTankerLitres, 6000);
    assert.equal(distribution.shelterAllocations[1].allocatedFromTankerLitres, 12000);
    assert.equal(distribution.whoCompliance, 'WHO_SPHERE_STANDARD_15L_MET');
});
