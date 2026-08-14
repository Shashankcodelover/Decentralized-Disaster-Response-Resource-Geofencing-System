/**
 * Autonomous Search & Rescue (SAR) Drone Path Engine
 * 
 * Generates optimal coverage flight paths over disaster zones:
 * 1. Parallel Track (Lawnmower) Search Sweep
 * 2. Expanding Square Search (for last-known victim GPS fix)
 * 3. Dynamic Hazard Avoidance around active DangerZone polygons
 */

export interface Waypoint {
  lat: number;
  lng: number;
  altitudeMeters: number;
  action: 'takeoff' | 'scan' | 'detour' | 'hover' | 'rtl'; // rtl = return to launch
  estimatedTimeSec: number;
}

export interface HazardPolygon {
  zoneId: string;
  polygon: [number, number][]; // [lng, lat]
  hazardType: string;
}

export interface MissionPlan {
  missionId: string;
  pattern: 'lawnmower' | 'expanding_square';
  waypoints: Waypoint[];
  totalDistanceKm: number;
  estimatedFlightTimeMinutes: number;
  estimatedBatteryDrainPct: number;
  coveredAreaSqKm: number;
  hazardAvoidanceDetoursCount: number;
}

/**
 * Calculates Haversine distance in kilometers.
 */
function distKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Ray casting Point-in-Polygon detection.
 */
function isInsideHazard(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Generates a Parallel Track / Lawnmower Search Pattern across a bounding box.
 */
export function generateLawnmowerSweep(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  laneSpacingKm: number = 0.5,
  altitudeMeters: number = 80,
  hazards: HazardPolygon[] = []
): MissionPlan {
  const missionId = `sar-lawnmower-${Date.now()}`;
  const waypoints: Waypoint[] = [];
  let detoursCount = 0;

  // Drone cruise speed: 12 m/s (43.2 km/h)
  const CRUISE_SPEED_KMH = 43.2;

  // Takeoff point at SW corner
  waypoints.push({
    lat: minLat,
    lng: minLng,
    altitudeMeters,
    action: 'takeoff',
    estimatedTimeSec: 15,
  });

  const latSpanKm = distKm(minLat, minLng, maxLat, minLng);
  const numLanes = Math.max(2, Math.ceil(latSpanKm / laneSpacingKm));
  const latStep = (maxLat - minLat) / (numLanes - 1);

  let goingEast = true;
  for (let i = 0; i < numLanes; i++) {
    const currentLat = minLat + i * latStep;
    const startLng = goingEast ? minLng : maxLng;
    const endLng = goingEast ? maxLng : minLng;

    // Check intermediate scan points
    const pointsInLane = 4;
    for (let p = 0; p <= pointsInLane; p++) {
      const currentLng = startLng + (endLng - startLng) * (p / pointsInLane);

      // Check if point intersects an active hazard zone
      let inHazard = false;
      for (const h of hazards) {
        if (isInsideHazard(currentLat, currentLng, h.polygon)) {
          inHazard = true;
          detoursCount++;
          break;
        }
      }

      if (inHazard) {
        // Apply altitude detour (+40m climb) and mark as detour action
        waypoints.push({
          lat: currentLat,
          lng: currentLng,
          altitudeMeters: altitudeMeters + 40,
          action: 'detour',
          estimatedTimeSec: 0,
        });
      } else {
        waypoints.push({
          lat: currentLat,
          lng: currentLng,
          altitudeMeters,
          action: 'scan',
          estimatedTimeSec: 0,
        });
      }
    }

    goingEast = !goingEast;
  }

  // Return to launch
  waypoints.push({
    lat: minLat,
    lng: minLng,
    altitudeMeters,
    action: 'rtl',
    estimatedTimeSec: 30,
  });

  // Calculate distances and times
  let totalDistanceKm = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const segDist = distKm(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
    totalDistanceKm += segDist;
    waypoints[i].estimatedTimeSec = Math.round((totalDistanceKm / CRUISE_SPEED_KMH) * 3600);
  }

  const estimatedFlightTimeMinutes = parseFloat(((totalDistanceKm / CRUISE_SPEED_KMH) * 60).toFixed(1));
  // 1 km flight uses ~2.5% battery on tactical quadcopter
  const estimatedBatteryDrainPct = Math.min(100, Math.round(totalDistanceKm * 2.5));
  const lngSpanKm = distKm(minLat, minLng, minLat, maxLng);
  const coveredAreaSqKm = parseFloat((latSpanKm * lngSpanKm).toFixed(2));

  return {
    missionId,
    pattern: 'lawnmower',
    waypoints,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    estimatedFlightTimeMinutes,
    estimatedBatteryDrainPct,
    coveredAreaSqKm,
    hazardAvoidanceDetoursCount: detoursCount,
  };
}

/**
 * Generates an Expanding Square Search pattern around a last-known position.
 */
export function generateExpandingSquareSearch(
  centerLat: number,
  centerLng: number,
  stepSizeKm: number = 0.3,
  iterations: number = 5,
  altitudeMeters: number = 60
): MissionPlan {
  const missionId = `sar-expand-sq-${Date.now()}`;
  const waypoints: Waypoint[] = [];
  const CRUISE_SPEED_KMH = 40.0;

  // Degrees approximation: 1 deg lat ~ 111 km
  const kmToDegLat = 1 / 111;
  const kmToDegLng = 1 / (111 * Math.cos(centerLat * Math.PI / 180));

  let currentLat = centerLat;
  let currentLng = centerLng;

  waypoints.push({
    lat: currentLat,
    lng: currentLng,
    altitudeMeters,
    action: 'takeoff',
    estimatedTimeSec: 10,
  });

  // Directions: North (0), East (1), South (2), West (3)
  const dLat = [1, 0, -1, 0];
  const dLng = [0, 1, 0, -1];
  let direction = 0;

  for (let iter = 1; iter <= iterations; iter++) {
    // Each leg length increases: 1, 1, 2, 2, 3, 3 ...
    for (let repeat = 0; repeat < 2; repeat++) {
      const legDistKm = iter * stepSizeKm;
      currentLat += dLat[direction] * legDistKm * kmToDegLat;
      currentLng += dLng[direction] * legDistKm * kmToDegLng;

      waypoints.push({
        lat: currentLat,
        lng: currentLng,
        altitudeMeters,
        action: 'scan',
        estimatedTimeSec: 0,
      });

      direction = (direction + 1) % 4;
    }
  }

  // RTL
  waypoints.push({
    lat: centerLat,
    lng: centerLng,
    altitudeMeters,
    action: 'rtl',
    estimatedTimeSec: 20,
  });

  let totalDistanceKm = 0;
  for (let i = 1; i < waypoints.length; i++) {
    totalDistanceKm += distKm(waypoints[i - 1].lat, waypoints[i - 1].lng, waypoints[i].lat, waypoints[i].lng);
    waypoints[i].estimatedTimeSec = Math.round((totalDistanceKm / CRUISE_SPEED_KMH) * 3600);
  }

  const totalArea = parseFloat(Math.pow((iterations * stepSizeKm * 2), 2).toFixed(2));

  return {
    missionId,
    pattern: 'expanding_square',
    waypoints,
    totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    estimatedFlightTimeMinutes: parseFloat(((totalDistanceKm / CRUISE_SPEED_KMH) * 60).toFixed(1)),
    estimatedBatteryDrainPct: Math.min(100, Math.round(totalDistanceKm * 2.8)),
    coveredAreaSqKm: totalArea,
    hazardAvoidanceDetoursCount: 0,
  };
}
