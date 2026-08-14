import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AcousticSosDetector, AudioSpectralFrame } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const acousticRouter = Router();

const defaultAcousticDetector = new AcousticSosDetector();

const audioFrameSchema = z.object({
  timestampMs: z.number(),
  dominantFrequencyHz: z.number().positive(),
  spectralPowerDb: z.number(),
  signalToNoiseRatioDb: z.number(),
  vocalPitchF0Hz: z.number().optional(),
  pitchModulationPercent: z.number().optional(),
  isPulsing: z.boolean().default(false),
  pulseDurationMs: z.number().optional(),
});

const acousticAnalysisSchema = z.object({
  sensorNodeId: z.string().min(1),
  locationCoordinates: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
  frames: z.array(audioFrameSchema).min(1),
});

/**
 * POST /api/v1/iot/audio/classify
 * Analyzes audio spectral frames from seismic/drone microphones to identify trapped victim SOS.
 */
acousticRouter.post('/classify', requireAuth, validate(acousticAnalysisSchema), (req, res) => {
  try {
    const { sensorNodeId, locationCoordinates, frames } = req.body;
    const classification = defaultAcousticDetector.classifyAudioBuffer(frames as AudioSpectralFrame[]);

    if (classification.isSosConfirmed) {
      const io = req.app.get('io');
      if (io) {
        io.emit('acoustic:sos:alert', {
          sensorNodeId,
          locationCoordinates,
          classification,
          timestamp: Date.now(),
        });
      }
    }

    logger.info(
      { sensorNodeId, type: classification.detectionType, confirmed: classification.isSosConfirmed },
      'Acoustic spectral classification completed'
    );

    res.json({
      success: true,
      sensorNodeId,
      classification,
    });
  } catch (err: any) {
    logger.error({ err }, 'Acoustic audio classification failed');
    res.status(500).json({ error: err.message || 'Acoustic analysis failed' });
  }
});
