import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ResourceHubModel } from '../models/ResourceHub';
import { evaluateSTART, summarizeMCI, PatientAssessment, TriageResult } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const triageRouter = Router();

// In-memory / persisted triage store
const activeAssessments = new Map<string, TriageResult>();

const assessmentSchema = z.object({
  patientId: z.string().min(1),
  isAbleToWalk: z.boolean(),
  isBreathing: z.boolean(),
  respiratoryRatePerMin: z.number().optional(),
  hasRadialPulse: z.boolean().optional(),
  capillaryRefillSec: z.number().optional(),
  followsCommands: z.boolean().optional(),
  hasSevereHemorrhage: z.boolean().optional(),
  ageYears: z.number().optional(),
  victimLocation: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
});

/**
 * POST /api/v1/triage/assess
 * Runs certified START triage algorithm on victim assessment and allocates nearest trauma hub.
 */
triageRouter.post('/assess', requireAuth, validate(assessmentSchema), async (req, res) => {
  try {
    const patientData = req.body as PatientAssessment & { victimLocation?: [number, number] };
    const result = evaluateSTART(patientData);

    // If victim coordinates provided, match to nearest resource hub with medical supplies
    if (patientData.victimLocation) {
      const [vLng, vLat] = patientData.victimLocation;
      const hubs = await ResourceHubModel.find();
      
      let nearestHub: any = null;
      let minDistanceKm = Infinity;

      for (const hub of hubs) {
        if (hub.location?.coordinates && hub.location.coordinates.length === 2) {
          const [hLng, hLat] = hub.location.coordinates;
          const dLat = (hLat - vLat) * Math.PI / 180;
          const dLon = (hLng - vLng) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(vLat * Math.PI / 180) * Math.cos(hLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          if (distKm < minDistanceKm) {
            minDistanceKm = distKm;
            nearestHub = hub;
          }
        }
      }

      if (nearestHub) {
        result.assignedHospital = {
          hubId: nearestHub._id.toString(),
          name: nearestHub.name,
          distanceKm: parseFloat(minDistanceKm.toFixed(2)),
        };
      }
    }

    activeAssessments.set(result.patientId, result);

    const io = req.app.get('io');
    if (io) {
      io.emit('triage:assessed', result);
    }

    logger.info({ patientId: result.patientId, color: result.color, priority: result.priorityLevel }, 'Triage assessment evaluated');
    res.status(201).json(result);
  } catch (err) {
    logger.error({ err }, 'Triage assessment error');
    res.status(500).json({ error: 'Failed to evaluate patient triage' });
  }
});

/**
 * GET /api/v1/triage/summary
 * Returns total casualty counts by triage color (RED, YELLOW, GREEN, BLACK), acuity index, and ambulance demand.
 */
triageRouter.get('/summary', requireAuth, async (_req, res) => {
  try {
    const list = Array.from(activeAssessments.values());
    const summary = summarizeMCI(list);
    res.json({
      summary,
      recentPatients: list.slice(-20).reverse(),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to compute MCI summary');
    res.status(500).json({ error: 'MCI summary error' });
  }
});
