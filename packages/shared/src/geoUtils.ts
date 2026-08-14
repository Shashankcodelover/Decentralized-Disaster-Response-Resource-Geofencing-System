/**
 * Shared Geospatial Utilities
 * 
 * Single source of truth for all geospatial math used across
 * the server. Prevents the bug-prone pattern of copying the same
 * algorithm into multiple files.
 */

/**
 * Ray-Casting algorithm to determine if a point lies inside a polygon.
 * Coordinates are [longitude, latitude] (GeoJSON convention).
 * 
 * This is the ONLY implementation of this algorithm in the codebase.
 * All other files MUST import from here.
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Haversine distance between two GPS coordinates in kilometers.
 * Parameters: (lat1, lon1, lat2, lon2)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Calculates the centroid (geometric center) of a polygon.
 * Coordinates are [longitude, latitude] (GeoJSON convention).
 */
export function polygonCentroid(polygon: [number, number][]): [number, number] {
  let lngSum = 0;
  let latSum = 0;
  for (const [lng, lat] of polygon) {
    lngSum += lng;
    latSum += lat;
  }
  return [lngSum / polygon.length, latSum / polygon.length];
}
