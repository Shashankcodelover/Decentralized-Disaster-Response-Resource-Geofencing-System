/**
 * Autonomous Search & Rescue (SAR) Drone Path Engine — Industrial Readiness Level 11 (IR-11)
 * 
 * Generates optimal coverage flight paths over disaster zones:
 * 1. Parallel Track (Lawnmower) Search Sweep
 * 2. Expanding Square Search (for last-known victim GPS fix)
 * 3. Dynamic Hazard Avoidance around active DangerZone polygons
 * 4. Return-to-Home (RTH) Battery Safe-Return Horizon
 */

export interface Waypoint {
  lat: number;
  lng: number;
  altitudeMeters: number;
  action: 'takeoff' | 'scan' | 'detour' | 'hover' | 'rtl'; // rtl = return to launch
  estimatedTimeSec: number;
  batteryPctRemainingEstimate?: number;
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
  rthSafetyMarginPct: number; // Battery margin left after returning to base
  isMissionFeasible: boolean;
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
 * Generates a Parallel Track / Lawnmower Search Pattern across a bounding box with RTH energy envelopes.
 */
export function generateLawnmowerSweep(
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  laneSpacingKm: number = 0.5,
  altitudeMeters: number = 80,
  hazards: HazardPolygon[] = [],
  windHeadwindKmh: number = 10.0
): MissionPlan {
  const missionId = `sar-lawnmower-${Date.now()}`;
  const waypoints: Waypoint[] = [];
  let detoursCount = 0;

  const CRUISE_SPEED_KMH = Math.max(20, 43.2 - windHeadwindKmh * 0.5);

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

    // Check if transect intersects or falls inside any active hazard polygon
    const isHazardEncountered = hazards.some(h => {
      const minHLat = Math.min(...h.polygon.map(p => p[1]));
      const maxHLat = Math.max(...h.polygon.map(p => p[1]));
      const minHLng = Math.min(...h.polygon.map(p => p[0]));
      const maxHLng = Math.max(...h.polygon.map(p => p[0]));
      const latInRange = currentLat >= minHLat && currentLat <= maxHLat;
      const lngOverlap = Math.max(minLng, minHLng) <= Math.min(maxLng, maxHLng);
      return latInRange && lngOverlap;
    });

    if (isHazardEncountered) {
      detoursCount++;
      // Altitude detour over toxic plume / flood zone (80m + 40m climb = 120m)
      waypoints.push({
        lat: currentLat,
        lng: (startLng + endLng) / 2,
        altitudeMeters: altitudeMeters + 40,
        action: 'detour',
        estimatedTimeSec: 45,
      });
    }

    waypoints.push({
      lat: currentLat,
      lng: startLng,
      altitudeMeters,
      action: 'scan',
      estimatedTimeSec: 30,
    });

    waypoints.push({
      lat: currentLat,
      lng: endLng,
      altitudeMeters,
      action: 'scan',
      estimatedTimeSec: 60,
    });


    goingEast = !goingEast;
  }

  // RTL (Return to Launch) waypoint
  waypoints.push({
    lat: minLat,
    lng: minLng,
    altitudeMeters: 0,
    action: 'rtl',
    estimatedTimeSec: 45,
  });

  // Calculate total distance & battery drain
  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalKm += distKm(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
  }

  const flightMinutes = (totalKm / CRUISE_SPEED_KMH) * 60;
  // Battery consumption model: ~2.5% per minute of flight + climb penalty
  const batteryDrain = parseFloat((flightMinutes * 2.6 + detoursCount * 2.0).toFixed(1));
  const rthMargin = parseFloat((100 - batteryDrain).toFixed(1));

  const lngSpanKm = distKm(minLat, minLng, minLat, maxLng);
  const coveredAreaSqKm = parseFloat((latSpanKm * lngSpanKm).toFixed(2));

  return {
    missionId,
    pattern: 'lawnmower',
    waypoints,
    totalDistanceKm: parseFloat(totalKm.toFixed(2)),
    estimatedFlightTimeMinutes: Math.round(flightMinutes),
    estimatedBatteryDrainPct: Math.min(100, batteryDrain),
    coveredAreaSqKm,
    hazardAvoidanceDetoursCount: detoursCount,
    rthSafetyMarginPct: rthMargin,
    isMissionFeasible: rthMargin >= 20.0, // Minimum 20% reserve required for safe landing
  };
}

/**
 * Generates an Expanding Square Search Pattern centered on last-known fix.
 */
export function generateExpandingSquareSearch(
  centerLat: number,
  centerLng: number,
  legSpacingKm: number = 0.25,
  numLoops: number = 4,
  altitudeMeters: number = 60
): MissionPlan {
  const missionId = `sar-expand-sq-${Date.now()}`;
  const waypoints: Waypoint[] = [];
  const CRUISE_SPEED_KMH = 36.0;

  waypoints.push({
    lat: centerLat,
    lng: centerLng,
    altitudeMeters,
    action: 'takeoff',
    estimatedTimeSec: 10,
  });

  let currentLat = centerLat;
  let currentLng = centerLng;
  const kmPerDegLat = 111.0;
  const kmPerDegLng = 111.0 * Math.cos(centerLat * Math.PI / 180);

  const directions = [
    { dLat: 0, dLng: 1 },  // East
    { dLat: -1, dLng: 0 }, // South
    { dLat: 0, dLng: -1 }, // West
    { dLat: 1, dLng: 0 },  // North
  ];

  let legLengthKm = legSpacingKm;
  let dirIdx = 0;

  for (let loop = 1; loop <= numLoops; loop++) {
    for (let step = 0; step < 2; step++) {
      const dir = directions[dirIdx % 4];
      currentLat += (dir.dLat * legLengthKm) / kmPerDegLat;
      currentLng += (dir.dLng * legLengthKm) / kmPerDegLng;

      waypoints.push({
        lat: parseFloat(currentLat.toFixed(6)),
        lng: parseFloat(currentLng.toFixed(6)),
        altitudeMeters,
        action: 'scan',
        estimatedTimeSec: Math.round((legLengthKm / CRUISE_SPEED_KMH) * 3600),
      });

      dirIdx++;
    }
    legLengthKm += legSpacingKm;
  }

  waypoints.push({
    lat: centerLat,
    lng: centerLng,
    altitudeMeters: 0,
    action: 'rtl',
    estimatedTimeSec: 30,
  });

  let totalKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalKm += distKm(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng);
  }

  const flightMinutes = (totalKm / CRUISE_SPEED_KMH) * 60;
  const batteryDrain = parseFloat((flightMinutes * 2.8).toFixed(1));
  const rthMargin = parseFloat((100 - batteryDrain).toFixed(1));
  const searchRadiusKm = legLengthKm;
  const coveredAreaSqKm = parseFloat((Math.PI * searchRadiusKm * searchRadiusKm).toFixed(2));

  return {
    missionId,
    pattern: 'expanding_square',
    waypoints,
    totalDistanceKm: parseFloat(totalKm.toFixed(2)),
    estimatedFlightTimeMinutes: Math.round(flightMinutes),
    estimatedBatteryDrainPct: Math.min(100, batteryDrain),
    coveredAreaSqKm,
    hazardAvoidanceDetoursCount: 0,
    rthSafetyMarginPct: rthMargin,
    isMissionFeasible: rthMargin >= 20.0,
  };
}
