import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  correlateVisionDetection,
  BoundingBoxDetection,
  VisionCorrelationResult,
} from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const droneVisionRouter = Router();

// In-memory detections cache
const recentDetections: VisionCorrelationResult[] = [];

const detectionSchema = z.object({
  detectionId: z.string().min(1),
  droneId: z.string().min(1),
  timestamp: z.number().positive(),
  aiClass: z.enum(['survivor_waving', 'trapped_person', 'structural_collapse', 'wildfire_front', 'flood_inundation']),
  confidence: z.number().min(0).max(1),
  thermalSignatureCelsius: z.number().optional(),
  groundBounds: z.object({
    minLng: z.number(),
    minLat: z.number(),
    maxLng: z.number(),
    maxLat: z.number(),
  }),
  centroid: z.tuple([z.number(), z.number()]), // [lng, lat]
});

/**
 * POST /api/v1/drones/vision/detections
 * Ingests high-frequency aerial drone AI computer vision bounding boxes.
 */
droneVisionRouter.post('/detections', requireAuth, validate(detectionSchema), async (req, res) => {
  try {
    const detection = req.body as BoundingBoxDetection;

    // Simulated known beacons (could also query DB or CRDT state)
    const knownBeacons = [
      { beaconId: 'beacon-101', coordinates: [77.5946, 12.9716] as [number, number], severity: 'CRITICAL' },
    ];

    const result = correlateVisionDetection(detection, knownBeacons);
    recentDetections.unshift(result);
    if (recentDetections.length > 100) recentDetections.pop();

    const io = req.app.get('io');
    if (io) {
      io.emit('drone:vision:detected', result);
    }

    logger.info(
      { detectionId: detection.detectionId, class: detection.aiClass, action: result.actionTaken },
      'Ingested drone AI vision detection'
    );
    res.status(201).json(result);
  } catch (err) {
    logger.error({ err }, 'Drone vision ingestion error');
    res.status(500).json({ error: 'Failed to process drone vision detection' });
  }
});

/**
 * GET /api/v1/drones/vision/summary
 * Returns recent detections and survivor heat counts.
 */
droneVisionRouter.get('/summary', requireAuth, async (_req, res) => {
  try {
    const survivorCount = recentDetections.filter(d => d.detection.aiClass === 'survivor_waving' || d.detection.aiClass === 'trapped_person').length;
    const hazardCount = recentDetections.filter(d => d.detection.aiClass === 'wildfire_front' || d.detection.aiClass === 'flood_inundation').length;

    res.json({
      totalDetections: recentDetections.length,
      activeSurvivorsIdentified: survivorCount,
      activeHazardPerimetersIdentified: hazardCount,
      recentDetections: recentDetections.slice(0, 20),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch drone vision summary');
    res.status(500).json({ error: 'Vision summary error' });
  }
});
