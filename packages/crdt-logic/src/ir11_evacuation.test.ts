import { describe, it } from 'node:test';
import assert from 'node:assert';
import { findSafestEvacuationRoute, calculateEdgeCost, RoadIntersection, RoadSegment } from './evacuationRouter';

describe('IR-11 Feature 2: Enhanced Multi-Hazard Evacuation Router', () => {
  const nodes: RoadIntersection[] = [
    { nodeId: 'N_ORIGIN', name: 'Flood Staging Point', lat: 12.9716, lng: 77.5946 },
    { nodeId: 'N_JUNCTION', name: 'Valley Road Crossing', lat: 12.978, lng: 77.602 },
    { nodeId: 'SHELTER_PRIMARY', name: 'High School Safe Haven', lat: 12.985, lng: 77.61, isShelter: true, shelterCapacity: 500, currentShelterOccupancy: 120 },
    { nodeId: 'SHELTER_SECONDARY', name: 'Stadium Evacuation Center', lat: 12.96, lng: 77.58, isShelter: true, shelterCapacity: 1200, currentShelterOccupancy: 400 },
  ];

  const edges: RoadSegment[] = [
    { edgeId: 'E1', fromNodeId: 'N_ORIGIN', toNodeId: 'N_JUNCTION', distanceKm: 1.5, damageFactor: 0.2, isPassable: true, activeHazardExposure: 0.1, congestionPenalty: 0.2, maxFloodWaterDepthM: 0.15 },
    { edgeId: 'E2', fromNodeId: 'N_JUNCTION', toNodeId: 'SHELTER_PRIMARY', distanceKm: 1.8, damageFactor: 0.3, isPassable: true, activeHazardExposure: 0.1, congestionPenalty: 0.3, maxFloodWaterDepthM: 0.2 },
    { edgeId: 'E3', fromNodeId: 'N_ORIGIN', toNodeId: 'SHELTER_SECONDARY', distanceKm: 4.2, damageFactor: 0.1, isPassable: true, activeHazardExposure: 0.0, congestionPenalty: 0.1, maxFloodWaterDepthM: 0.0 },
  ];

  it('solves safest primary route and generates secondary contingency failover', () => {
    const plan = findSafestEvacuationRoute('N_ORIGIN', nodes, edges, undefined, 'AMBULANCE');
    assert.ok(plan !== null);
    assert.strictEqual(plan.pathNodeIds[0], 'N_ORIGIN');
    assert.strictEqual(plan.targetShelter?.nodeId, 'SHELTER_SECONDARY');
    assert.strictEqual(plan.targetShelter?.availableCapacity, 800);
    assert.ok(plan.contingencyFailoverPlan !== undefined);
  });


  it('respects vehicle clearance limits during flood inundation', () => {
    const floodedEdges: RoadSegment[] = [
      { edgeId: 'E_DEEP', fromNodeId: 'N_ORIGIN', toNodeId: 'SHELTER_PRIMARY', distanceKm: 1.0, damageFactor: 0, isPassable: true, activeHazardExposure: 0, congestionPenalty: 0, maxFloodWaterDepthM: 0.6 },
    ];

    // Standard ambulance cannot cross 60cm water
    const ambulancePlan = findSafestEvacuationRoute('N_ORIGIN', nodes, floodedEdges, 'SHELTER_PRIMARY', 'AMBULANCE');
    assert.strictEqual(ambulancePlan, null);

    // High clearance truck CAN cross up to 90cm water
    const truckPlan = findSafestEvacuationRoute('N_ORIGIN', nodes, floodedEdges, 'SHELTER_PRIMARY', 'HIGH_CLEARANCE_TRUCK');
    assert.ok(truckPlan !== null);
    assert.strictEqual(truckPlan.vehicleProfile, 'HIGH_CLEARANCE_TRUCK');
  });
});
