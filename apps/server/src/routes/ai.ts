import { Router } from 'express';
import { calculateOptimalRoute } from '../services/routingService';
import { predictResourceBurnRates, generateFemaSitrep } from '../services/aiLogisticsService';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
import logger from '../logger';

export const aiRouter = Router();

const optimalRouteSchema = z.object({
  from: z.tuple([z.number(), z.number()]), // [lng, lat]
  to: z.tuple([z.number(), z.number()]),
  wheelchair: z.boolean().optional(),
});

/**
 * POST /api/v1/ai/optimal-route
 * Returns the shortest path avoiding active high/critical danger zones.
 */
aiRouter.post('/optimal-route', requireAuth, validate(optimalRouteSchema), async (req, res) => {
  try {
    const { from, to, wheelchair } = req.body as { from: [number, number]; to: [number, number]; wheelchair?: boolean };
    const path = await calculateOptimalRoute(from, to, wheelchair);
    res.json({ path });
  } catch (err) {
    logger.error({ err }, 'Optimal route calculation endpoint failed');
    res.status(500).json({ error: 'Failed to calculate optimal route' });
  }
});

/**
 * GET /api/v1/ai/predictive-burn
 * Returns predicted depletion logs for all active hubs.
 */
aiRouter.get('/predictive-burn', requireAuth, async (_req, res) => {
  try {
    const predictions = await predictResourceBurnRates();
    res.json(predictions);
  } catch (err) {
    logger.error({ err }, 'Predictive burn rate endpoint failed');
    res.status(500).json({ error: 'Failed to forecast burn rates' });
  }
});

/**
 * GET /api/v1/ai/sitrep
 * Returns the auto-generated FEMA Incident Situation Briefing report.
 */
aiRouter.get('/sitrep', requireAuth, requireRole('admin', 'coordinator'), async (_req, res) => {
  try {
    const report = await generateFemaSitrep();
    res.set('Content-Type', 'text/plain');
    res.send(report);
  } catch (err) {
    logger.error({ err }, 'SITREP endpoint failed');
    res.status(500).json({ error: 'Failed to generate situation report' });
  }
});
