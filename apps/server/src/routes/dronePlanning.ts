import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { DangerZoneModel } from '../models/DangerZone';
import { generateLawnmowerSweep, generateExpandingSquareSearch, HazardPolygon } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const dronePlanningRouter = Router();

const lawnmowerSchema = z.object({
  pattern: z.literal('lawnmower'),
  bounds: z.object({
    minLat: z.number(),
    maxLat: z.number(),
    minLng: z.number(),
    maxLng: z.number(),
  }),
  laneSpacingKm: z.number().positive().default(0.4),
  altitudeMeters: z.number().positive().default(80),
});

const expandingSquareSchema = z.object({
  pattern: z.literal('expanding_square'),
  centerLat: z.number(),
  centerLng: z.number(),
  stepSizeKm: z.number().positive().default(0.3),
  iterations: z.number().int().min(1).max(10).default(5),
  altitudeMeters: z.number().positive().default(60),
});

const missionSchema = z.discriminatedUnion('pattern', [lawnmowerSchema, expandingSquareSchema]);

/**
 * POST /api/v1/drones/plan-mission
 * Generates an autonomous SAR drone flight plan avoiding active danger zones.
 */
dronePlanningRouter.post('/plan-mission', requireAuth, validate(missionSchema), async (req, res) => {
  try {
    const activeZones = await DangerZoneModel.find({ active: { $ne: false } });
    const hazards: HazardPolygon[] = activeZones
      .filter(z => z.geometry?.coordinates?.[0]?.length)
      .map(z => ({
        zoneId: z._id.toString(),
        polygon: (z.geometry.coordinates[0] || []) as [number, number][],
        hazardType: z.severity,
      }));

    let plan;
    if (req.body.pattern === 'lawnmower') {
      const { bounds, laneSpacingKm, altitudeMeters } = req.body;
      plan = generateLawnmowerSweep(
        bounds.minLat,
        bounds.maxLat,
        bounds.minLng,
        bounds.maxLng,
        laneSpacingKm,
        altitudeMeters,
        hazards
      );
    } else {
      const { centerLat, centerLng, stepSizeKm, iterations, altitudeMeters } = req.body;
      plan = generateExpandingSquareSearch(
        centerLat,
        centerLng,
        stepSizeKm,
        iterations,
        altitudeMeters
      );
    }

    logger.info({ missionId: plan.missionId, pattern: plan.pattern, waypoints: plan.waypoints.length }, 'SAR drone mission generated');
    res.status(201).json(plan);
  } catch (err) {
    logger.error({ err }, 'Drone mission planning failed');
    res.status(500).json({ error: 'Failed to generate drone SAR flight plan' });
  }
});
