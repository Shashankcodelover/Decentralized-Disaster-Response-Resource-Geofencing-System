// Geofenced Resource Allocation Engine & Location Anonymizer

export interface GeofenceZone {
  zoneId: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  allocatedSupplies: {
    waterLiters: number;
    foodKits: number;
    firstAidKits: number;
  };
}

export interface VictimLocation {
  userId: string;
  exactLat: number;
  exactLng: number;
}

// Calculate Haversine distance between two coordinates in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Anonymize precise GPS location by rounding to grid resolution (~100m blur)
export function anonymizeCoordinates(lat: number, lng: number, gridResolution: number = 0.001): { blurredLat: number; blurredLng: number } {
  return {
    blurredLat: Math.round(lat / gridResolution) * gridResolution,
    blurredLng: Math.round(lng / gridResolution) * gridResolution,
  };
}

// Evaluate whether victim is inside a emergency geofence zone
export function isWithinGeofence(location: VictimLocation, zone: GeofenceZone): boolean {
  const distance = calculateDistanceKm(location.exactLat, location.exactLng, zone.centerLat, zone.centerLng);
  return distance <= zone.radiusKm;
}
