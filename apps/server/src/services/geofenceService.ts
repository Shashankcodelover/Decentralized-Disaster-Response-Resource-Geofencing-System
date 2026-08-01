import { DangerZoneModel } from '../models/DangerZone';
import type { GeofenceAlert } from '@mirage/shared-types';

// In-memory cache of which zones each responder is currently inside
const responderZoneCache = new Map<string, Set<string>>();

/**
 * Checks if a responder has entered or exited any danger zones.
 * Returns alerts for state transitions only (enter/exit), not steady state.
 */
export async function handleGeofenceCheck(
  responderId: string,
  coordinates: [number, number]
): Promise<GeofenceAlert[]> {
  const alerts: GeofenceAlert[] = [];

  const currentZones = await DangerZoneModel.find({
    active: true,
    geometry: {
      $geoIntersects: {
        $geometry: { type: 'Point', coordinates },
      },
    },
  }).select('_id name');

  const currentZoneIds = new Set(currentZones.map((z) => String(z._id)));
  const previousZoneIds = responderZoneCache.get(responderId) ?? new Set<string>();

  // Detect entries
  for (const zone of currentZones) {
    const id = String(zone._id);
    if (!previousZoneIds.has(id)) {
      alerts.push({
        type: 'enter',
        zoneId: id,
        zoneName: zone.name,
        responderId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Detect exits
  for (const prevId of previousZoneIds) {
    if (!currentZoneIds.has(prevId)) {
      alerts.push({
        type: 'exit',
        zoneId: prevId,
        zoneName: 'Unknown',
        responderId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  responderZoneCache.set(responderId, currentZoneIds);
  return alerts;
}
