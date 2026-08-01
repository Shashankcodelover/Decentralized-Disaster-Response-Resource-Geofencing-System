import { Router } from 'express';
import { DangerZoneModel } from '../models/DangerZone';
import { validate } from '../middleware/validate';
import { geofenceCheckSchema } from '../schemas/responder.schema';
import logger from '../logger';

export const geofenceRouter = Router();

/**
 * POST /api/geofence/check
 * Body: { coordinates: [lng, lat] }
 * Returns all active danger zones that contain the given point.
 */
geofenceRouter.post('/check', validate(geofenceCheckSchema), async (req, res) => {
  try {
    const { coordinates } = req.body as { coordinates: [number, number] };
    const zones = await DangerZoneModel.find({
      active: true,
      geometry: {
        $geoIntersects: {
          $geometry: { type: 'Point', coordinates },
        },
      },
    });
    res.json({ insideZones: zones });
  } catch (err) {
    logger.error({ err }, 'Geofence check failed');
    res.status(500).json({ error: 'Geofence check failed' });
  }
});
