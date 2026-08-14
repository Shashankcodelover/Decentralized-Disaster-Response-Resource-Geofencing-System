/**
 * Location Privacy Service
 * Provides coordinate anonymization to prevent exact GPS leakage
 * over unauthenticated or broadcast channels.
 */

// Map of responderId to their last stable anonymized grid coordinate
const stableLocations = new Map<string, { blurredLng: number; blurredLat: number }>();

/**
 * Anonymizes precise GPS coordinates to protect responder privacy.
 * Uses a grid rounding approach with Hysteresis (buffer zone) to prevent
 * oscillation when standing on a boundary line (fixes Rejector Audit #3).
 */
export function anonymizeCoordinates(
  responderId: string,
  lng: number,
  lat: number,
  gridResolution: number = 0.001 // ~100m
): { blurredLng: number; blurredLat: number } {
  
  const rawBlurredLng = Math.round(lng / gridResolution) * gridResolution;
  const rawBlurredLat = Math.round(lat / gridResolution) * gridResolution;

  const lastStable = stableLocations.get(responderId);

  // If no previous location, this is the new stable baseline
  if (!lastStable) {
    const newLoc = { blurredLng: rawBlurredLng, blurredLat: rawBlurredLat };
    stableLocations.set(responderId, newLoc);
    return newLoc;
  }

  // Hysteresis: only update if they moved more than 50% of the grid resolution
  // This prevents jitter oscillation on boundary lines
  const distance = Math.sqrt(
    Math.pow(lng - lastStable.blurredLng, 2) + Math.pow(lat - lastStable.blurredLat, 2)
  );

  if (distance > gridResolution * 0.5) {
    // Escaped the buffer zone, update stable location
    const newLoc = { blurredLng: rawBlurredLng, blurredLat: rawBlurredLat };
    stableLocations.set(responderId, newLoc);
    return newLoc;
  }

  // Inside buffer zone, return previous stable location to prevent jitter
  return lastStable;
}
