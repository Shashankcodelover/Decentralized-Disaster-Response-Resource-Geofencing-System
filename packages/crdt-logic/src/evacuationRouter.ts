/**
 * Dynamic Risk-Weighted Evacuation Graph Router
 * 
 * Computes optimal evacuation paths on road networks during evolving disasters.
 * Evaluates composite cost functions accounting for:
 * 1. Physical Road Distance (km)
 * 2. Road Structural Damage Factor (0.0 to 3.0)
 * 3. Proximity to Active Hazard Zones (Fire plumes, radiation, flood inundation)
 * 4. Evacuee Traffic Congestion Penalty
 */

export interface RoadIntersection {
  nodeId: string;
  name: string;
  lat: number;
  lng: number;
  isShelter?: boolean;
  shelterCapacity?: number;
}

export interface RoadSegment {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  distanceKm: number;
  damageFactor: number;      // 0.0 = clear, 1.0 = heavy debris, 3.0 = partially impassable
  isPassable: boolean;
  activeHazardExposure: number; // 0.0 = safe, 1.0 = critical proximity
  congestionPenalty: number;    // 0.0 = empty, 1.0 = severe gridlock
}

export interface EvacuationRoutePlan {
  pathNodeIds: string[];
  pathCoordinates: [number, number][]; // [[lng, lat]]
  totalDistanceKm: number;
  estimatedTransitTimeMinutes: number;
  compositeCost: number;
  safetyScore: number;                 // 0 to 100 (100 = completely hazard-free)
  targetShelter?: {
    nodeId: string;
    name: string;
  };
  warnings: string[];
}

/**
 * Calculates Haversine distance in kilometers.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Computes composite edge cost for evacuation routing.
 */
export function calculateEdgeCost(segment: RoadSegment): number {
  if (!segment.isPassable) return Infinity;

  // Base physical distance
  const baseCost = segment.distanceKm;

  // Multipliers
  const damageCost = segment.distanceKm * segment.damageFactor * 1.5;
  const hazardCost = segment.activeHazardExposure * 10.0; // High penalty for hazard proximity
  const congestionCost = segment.congestionPenalty * 3.0;

  return baseCost + damageCost + hazardCost + congestionCost;
}

/**
 * Executes an A* evacuation path search from a start node to the closest safe shelter.
 */
export function findSafestEvacuationRoute(
  startNodeId: string,
  nodes: RoadIntersection[],
  edges: RoadSegment[],
  targetShelterId?: string
): EvacuationRoutePlan | null {
  const nodeMap = new Map<string, RoadIntersection>();
  nodes.forEach(n => nodeMap.set(n.nodeId, n));

  const startNode = nodeMap.get(startNodeId);
  if (!startNode) return null;

  // Identify shelter destinations
  const shelterNodes = nodes.filter(n => targetShelterId ? n.nodeId === targetShelterId : n.isShelter);
  if (shelterNodes.length === 0) return null;

  // Adjacency graph
  const adj = new Map<string, { to: string; segment: RoadSegment }[]>();
  for (const edge of edges) {
    if (!adj.has(edge.fromNodeId)) adj.set(edge.fromNodeId, []);
    if (!adj.has(edge.toNodeId)) adj.set(edge.toNodeId, []);

    adj.get(edge.fromNodeId)!.push({ to: edge.toNodeId, segment: edge });
    // Bidirectional roads
    adj.get(edge.toNodeId)!.push({ to: edge.fromNodeId, segment: edge });
  }

  // Priority Queue structure (Dijkstra / A*)
  const dist = new Map<string, number>();
  const prev = new Map<string, { nodeId: string; segment: RoadSegment }>();
  const visited = new Set<string>();

  nodes.forEach(n => dist.set(n.nodeId, Infinity));
  dist.set(startNodeId, 0);

  const unvisitedNodes = new Set<string>(nodes.map(n => n.nodeId));

  while (unvisitedNodes.size > 0) {
    // Find unvisited node with smallest distance
    let currentId: string | null = null;
    let minD = Infinity;

    for (const id of unvisitedNodes) {
      const d = dist.get(id) ?? Infinity;
      if (d < minD) {
        minD = d;
        currentId = id;
      }
    }

    if (!currentId || minD === Infinity) break; // All remaining unreachable
    unvisitedNodes.delete(currentId);
    visited.add(currentId);

    // If destination shelter reached
    const isDestShelter = shelterNodes.some(s => s.nodeId === currentId);
    if (isDestShelter && (!targetShelterId || currentId === targetShelterId)) {
      break; // Found optimal shelter route
    }

    const neighbors = adj.get(currentId) || [];
    for (const { to, segment } of neighbors) {
      if (visited.has(to)) continue;

      const edgeCost = calculateEdgeCost(segment);
      if (edgeCost === Infinity) continue;

      const newDist = (dist.get(currentId) || 0) + edgeCost;
      if (newDist < (dist.get(to) || Infinity)) {
        dist.set(to, newDist);
        prev.set(to, { nodeId: currentId, segment });
      }
    }
  }

  // Find which shelter was reached with minimum cost
  let bestShelter: RoadIntersection | null = null;
  let bestCost = Infinity;

  for (const s of shelterNodes) {
    const c = dist.get(s.nodeId) ?? Infinity;
    if (c < bestCost) {
      bestCost = c;
      bestShelter = s;
    }
  }

  if (!bestShelter || bestCost === Infinity) {
    return null; // No passable path to any shelter
  }

  // Reconstruct path
  const pathNodeIds: string[] = [];
  const pathCoordinates: [number, number][] = [];
  const warnings: string[] = [];
  let curr: string | undefined = bestShelter.nodeId;
  let totalDistanceKm = 0;
  let totalHazardExposure = 0;

  while (curr) {
    pathNodeIds.unshift(curr);
    const n = nodeMap.get(curr);
    if (n) pathCoordinates.unshift([n.lng, n.lat]);

    const p = prev.get(curr);
    if (p) {
      totalDistanceKm += p.segment.distanceKm;
      totalHazardExposure += p.segment.activeHazardExposure;
      if (p.segment.damageFactor > 1.0) {
        warnings.push(`Caution: Road segment ${p.segment.edgeId} has structural debris.`);
      }
      if (p.segment.activeHazardExposure > 0.5) {
        warnings.push(`Warning: High hazard exposure detected along ${p.segment.edgeId}.`);
      }
      curr = p.nodeId;
    } else {
      break;
    }
  }

  // Average vehicle speed in disaster: 25 km/h
  const estimatedTransitTimeMinutes = parseFloat(((totalDistanceKm / 25) * 60).toFixed(1));
  
  // Safety score calculation (100 minus hazard deductions)
  const safetyScore = Math.max(10, Math.min(100, Math.round(100 - (totalHazardExposure * 30))));

  return {
    pathNodeIds,
    pathCoordinates,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    estimatedTransitTimeMinutes,
    compositeCost: parseFloat(bestCost.toFixed(2)),
    safetyScore,
    targetShelter: {
      nodeId: bestShelter.nodeId,
      name: bestShelter.name,
    },
    warnings,
  };
}
