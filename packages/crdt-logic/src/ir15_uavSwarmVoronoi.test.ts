import test from 'node:test';
import assert from 'node:assert/strict';
import { uavSwarmVoronoiEngine, DroneAgent } from './uavSwarmVoronoiEngine';

test('Grand Finale Stage 3: UAVSwarmVoronoiEngine partitions disaster zone into non-overlapping sectors', () => {
    const box = { minLat: 12.3000, maxLat: 12.3200, minLon: 76.6000, maxLon: 76.6300 };
    const drones: DroneAgent[] = [
        { droneId: 'DRONE_ALPHA', currentLat: 12.305, currentLon: 76.605, batteryLevelPct: 90, cruiseSpeedMps: 15, thermalSensorActive: true },
        { droneId: 'DRONE_BRAVO', currentLat: 12.315, currentLon: 76.620, batteryLevelPct: 45, cruiseSpeedMps: 15, thermalSensorActive: true },
    ];

    const sectors = uavSwarmVoronoiEngine.partitionDisasterZone(box, drones);
    assert.equal(sectors.length, 2);
    assert.equal(sectors[0].assignedDroneId, 'DRONE_ALPHA');
    assert.equal(sectors[0].sweepPattern, 'PARALLEL_LAWNMOWER');
    assert.equal(sectors[1].assignedDroneId, 'DRONE_BRAVO');
    assert.equal(sectors[1].sweepPattern, 'EXPANDING_HEXAGON'); // Battery <= 50%
});

test('Grand Finale Stage 3: UAVSwarmVoronoiEngine calculates RTH energy reserve envelope accurately', () => {
    const droneNominal: DroneAgent = { droneId: 'D1', currentLat: 0, currentLon: 0, batteryLevelPct: 80, cruiseSpeedMps: 15, thermalSensorActive: true };
    const rthNominal = uavSwarmVoronoiEngine.evaluateRTHFailsafe(droneNominal, 2.0, 5); // 2 km distance
    assert.equal(rthNominal.mustReturnToHome, false);
    assert.equal(rthNominal.status, 'NOMINAL_SEARCH_MISSION_ACTIVE');

    // Low battery drone 10 km away
    const droneCritical: DroneAgent = { droneId: 'D2', currentLat: 0, currentLon: 0, batteryLevelPct: 22, cruiseSpeedMps: 15, thermalSensorActive: true };
    const rthCritical = uavSwarmVoronoiEngine.evaluateRTHFailsafe(droneCritical, 6.0, 5);
    assert.equal(rthCritical.mustReturnToHome, true);
    assert.equal(rthCritical.status, 'CRITICAL_RTH_TRIGGERED_ENERGY_ENVELOPE');
});
