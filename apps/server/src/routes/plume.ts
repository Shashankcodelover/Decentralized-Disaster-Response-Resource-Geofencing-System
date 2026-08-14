import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AtmosphericPlumeEngine, StabilityClass } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const plumeRouter = Router();

const defaultPlumeEngine = new AtmosphericPlumeEngine();

const plumeSimulationSchema = z.object({
  sourceId: z.string().min(1),
  contaminantName: z.string().min(1).default('TOXIC_GAS'),
  releaseRateGramsPerSec: z.number().positive().default(500),
  effectiveHeightMeters: z.number().min(0).default(10),
  originCoordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
  windSpeedMps: z.number().positive().default(3.0),
  windBearingDegrees: z.number().min(0).max(360).default(270),
  stabilityClass: z.enum(['A', 'B', 'C', 'D', 'E', 'F']).default('D'),
});

/**
 * POST /api/v1/hazard/plume/simulate
 * Simulates Gaussian Plume chemical/smoke dispersion and generates hazard contour polygons.
 */
plumeRouter.post('/simulate', requireAuth, validate(plumeSimulationSchema), (req, res) => {
  try {
    const result = defaultPlumeEngine.simulatePlume(req.body);

    const io = req.app.get('io');
    if (io) {
      io.emit('hazard:plume:updated', result);
    }

    logger.info(
      { sourceId: result.sourceId, contaminant: result.contaminantName, urgency: result.evacuationUrgency },
      'Atmospheric plume dispersion simulated'
    );

    res.json({
      success: true,
      simulation: result,
    });
  } catch (err: any) {
    logger.error({ err }, 'Plume simulation failed');
    res.status(500).json({ error: err.message || 'Plume dispersion simulation failed' });
  }
});
