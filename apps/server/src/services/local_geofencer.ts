/**
 * Disaster Response: Point-in-Polygon Ray Casting Geofencing Engine (V20).
 * Calculates offline coordinate checks to trigger local hazard zone warnings.
 */

export interface Point {
    latitude: number;
    longitude: number;
}

export interface HazardZone {
    id: string;
    name: string;
    polygon: Point[]; // Boundary vertices
    dangerLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Ray-Casting algorithm to check if a point lies inside a polygon of coordinates.
 */
export function isPointInsidePolygon(point: Point, polygon: Point[]): boolean {
    const x = point.longitude;
    const y = point.latitude;
    
    let inside = false;
    const numPoints = polygon.length;
    
    for (let i = 0, j = numPoints - 1; i < numPoints; j = i++) {
        const xi = polygon[i].longitude;
        const yi = polygon[i].latitude;
        const xj = polygon[j].longitude;
        const yj = polygon[j].latitude;
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
        if (intersect) {
            inside = !inside;
        }
    }
    
    return inside;
}

/**
 * Audits a responder's current location and logs alert notifications.
 */
export function auditResponderLocation(
    responderId: string,
    currentLocation: Point,
    activeZones: HazardZone[]
): { insideHazard: boolean; alerts: string[]; dangerLevel: string | null } {
    const alerts: string[] = [];
    let insideHazard = false;
    let dangerLevel: string | null = null;

    activeZones.forEach(zone => {
        if (isPointInsidePolygon(currentLocation, zone.polygon)) {
            insideHazard = true;
            dangerLevel = zone.dangerLevel;
            const alertMsg = `[CRITICAL ALERT] Responder ${responderId} entered "${zone.name}" zone. Danger Level: ${zone.dangerLevel.toUpperCase()}.`;
            alerts.push(alertMsg);
            console.warn(alertMsg);
        }
    });

    return {
        insideHazard,
        alerts,
        dangerLevel
    };
}

// ── V21: 5 SCALABLE PREMIUM FEATURES ──

export interface ResponderNode {
    id: string;
    latitude: number;
    longitude: number;
    activeConnections: string[]; // neighbor responder IDs in range
}

/**
 * 1. P2P Wi-Fi Routing Mesh Network Simulation (BFS path solver)
 * Finds the shortest relay path to transmit telemetry back to central station.
 */
export function findShortestMeshRelayPath(
    nodes: Map<string, ResponderNode>,
    startNodeId: string,
    targetNodeId: string
): string[] {
    if (!nodes || !nodes.has(startNodeId)) {
        return [];
    }
    const queue: string[][] = [[startNodeId]];
    const visited = new Set<string>([startNodeId]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const currentId = path[path.length - 1];
        
        if (currentId === targetNodeId) {
            return path;
        }

        const currentNode = nodes.get(currentId);
        if (currentNode) {
            for (const neighborId of currentNode.activeConnections) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push([...path, neighborId]);
                }
            }
        }
    }

    return []; // No path found
}

/**
 * 2. Dynamic Evacuation Path Planner
 * Directs path steps away from geofence hazard zones.
 */
export function filterEvacuationRoute(
    originalRoute: Point[],
    activeHazards: HazardZone[]
): Point[] {
    // Exclude route coordinate points that fall inside hazard zones
    return originalRoute.filter(point => {
        return !activeHazards.some(zone => isPointInsidePolygon(point, zone.polygon));
    });
}

export interface ReliefRequest {
    requestId: string;
    latitude: number;
    longitude: number;
    casualtyCount: number;
    urgency: 'low' | 'high' | 'life-threatening';
}

/**
 * 3. Emergency Resource Allocation Priority Queue
 */
export function prioritizeReliefRequests(requests: ReliefRequest[]): ReliefRequest[] {
    return [...requests].sort((a, b) => {
        // Priority weight calculation
        const getWeight = (r: ReliefRequest) => {
            const urgencyMultiplier = r.urgency === 'life-threatening' ? 100 : (r.urgency === 'high' ? 50 : 10);
            return r.casualtyCount * urgencyMultiplier;
        };
        return getWeight(b) - getWeight(a); // descending priority weight
    });
}

/**
 * 4. Geo-Targeted Alert Broadcaster
 * Identifies if a responder's current position is within warning distance to any critical hazard zone.
 * Checks against ALL polygon vertices and the centroid — not just vertex[0].
 */
export function broadcastGeofenceAlerts(
    responderLocation: Point,
    activeZones: HazardZone[],
    safetyDistanceKm: number = 2.0
): string[] {
    const warnings: string[] = [];

    activeZones.forEach(zone => {
        if (zone.polygon.length === 0) return;

        // Calculate the true polygon centroid
        const centroid = calculatePolygonCentroid(zone.polygon);

        // Find the minimum distance across ALL vertices + centroid
        let minDist = Infinity;

        // Check distance to centroid
        const centroidDist = getDistanceKm(
            responderLocation.latitude, responderLocation.longitude,
            centroid.latitude, centroid.longitude
        );
        minDist = Math.min(minDist, centroidDist);

        // Check distance to EVERY vertex (catches irregular/elongated polygons)
        for (const vertex of zone.polygon) {
            const dist = getDistanceKm(
                responderLocation.latitude, responderLocation.longitude,
                vertex.latitude, vertex.longitude
            );
            minDist = Math.min(minDist, dist);
        }

        // Also check distance to edge midpoints for large polygon edges
        for (let i = 0; i < zone.polygon.length; i++) {
            const a = zone.polygon[i];
            const b = zone.polygon[(i + 1) % zone.polygon.length];
            const midLat = (a.latitude + b.latitude) / 2;
            const midLng = (a.longitude + b.longitude) / 2;
            const midDist = getDistanceKm(
                responderLocation.latitude, responderLocation.longitude,
                midLat, midLng
            );
            minDist = Math.min(minDist, midDist);
        }

        if (minDist <= safetyDistanceKm) {
            warnings.push(`[PROXIMITY WARNING] Active Hazard "${zone.name}" is only ${minDist.toFixed(1)} km away. Danger Level: ${zone.dangerLevel.toUpperCase()}`);
        }
    });

    return warnings;
}

/**
 * Calculates the centroid (geometric center) of a polygon.
 */
function calculatePolygonCentroid(polygon: Point[]): Point {
    let latSum = 0;
    let lngSum = 0;
    for (const p of polygon) {
        latSum += p.latitude;
        lngSum += p.longitude;
    }
    return {
        latitude: latSum / polygon.length,
        longitude: lngSum / polygon.length,
    };
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * 5. Dynamic Incident Logs Summary
 */
export function compileIncidentReport(
    respondersCount: number,
    activeHazards: HazardZone[],
    reliefQueue: ReliefRequest[]
): {
    systemAlertStatus: string;
    totalHazards: number;
    pendingRescues: number;
    criticalRequestsCount: number;
} {
    const criticalCount = reliefQueue.filter(r => r.urgency === 'life-threatening').length;
    let status = 'NORMAL';
    
    if (criticalCount > 0 || activeHazards.some(h => h.dangerLevel === 'critical')) {
        status = 'RED_ALERT';
    } else if (activeHazards.length > 0) {
        status = 'YELLOW_WARNING';
    }

    return {
        systemAlertStatus: status,
        totalHazards: activeHazards.length,
        pendingRescues: reliefQueue.length,
        criticalRequestsCount: criticalCount
    };
}
