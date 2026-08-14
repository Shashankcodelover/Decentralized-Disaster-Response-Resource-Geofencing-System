import { Router } from 'express';
import { ResponderModel } from '../models/Responder';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { createResponderSchema, updateLocationSchema } from '../schemas/responder.schema';
import logger from '../logger';

export const respondersRouter = Router();

respondersRouter.get('/', requireAuth, async (_req, res) => {
  try {
    const responders = await ResponderModel.find();
    res.json(responders);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch responders');
    res.status(500).json({ error: 'Failed to fetch responders' });
  }
});

respondersRouter.post('/', requireAuth, requireRole('admin', 'coordinator'), validate(createResponderSchema), async (req, res) => {
  try {
    const responder = await ResponderModel.create(req.body);
    logger.info({ responderId: responder._id, user: req.user?.sub }, 'Responder created');
    res.status(201).json(responder);
  } catch (err) {
    logger.error({ err }, 'Invalid responder data');
    res.status(400).json({ error: 'Invalid responder data' });
  }
});

// PATCH /api/responders/:id/location — update GPS position
respondersRouter.patch('/:id/location', requireAuth, validate(updateLocationSchema), async (req, res) => {
  try {
    if (req.user?.role !== 'coordinator' && req.user?.role !== 'admin' && req.user?.sub !== req.params.id) {
      return res.status(403).json({ error: 'Unauthorized: cannot update location of another responder' });
    }

    const { coordinates } = req.body; // [lng, lat]
    const responder = await ResponderModel.findByIdAndUpdate(
      req.params.id,
      { location: { type: 'Point', coordinates } },
      { new: true }
    );
    if (!responder) return res.status(404).json({ error: 'Responder not found' });
    logger.info({ responderId: responder._id }, 'Responder location updated');
    res.json(responder);
  } catch (err) {
    logger.error({ err }, 'Location update failed');
    res.status(400).json({ error: 'Update failed' });
  }
});

import { PublicKeyModel } from '../models/PublicKey';
import { z } from 'zod';

const publicKeySchema = z.object({
  publicKeyBase64: z.string().min(1),
  algorithm: z.string().default('ECDH-P256'),
});

/**
 * POST /api/v1/responders/keys
 * Publish a public key for the authenticated responder (PKI for E2EE).
 */
respondersRouter.post('/keys', requireAuth, validate(publicKeySchema), async (req, res) => {
  try {
    const responderId = req.user!.sub;
    const { publicKeyBase64, algorithm } = req.body;
    
    await PublicKeyModel.findOneAndUpdate(
      { responderId },
      { publicKeyBase64, algorithm, timestamp: new Date() },
      { upsert: true, new: true }
    );
    
    logger.info({ responderId }, 'Public key published successfully');
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to publish public key');
    res.status(500).json({ error: 'Key publication failed' });
  }
});

/**
 * GET /api/v1/responders/:id/key
 * Fetch the public key of a specific responder for E2EE negotiation.
 */
respondersRouter.get('/:id/key', requireAuth, async (req, res) => {
  try {
    const keyRecord = await PublicKeyModel.findOne({ responderId: req.params.id });
    if (!keyRecord) {
      return res.status(404).json({ error: 'Public key not found for this responder' });
    }
    res.json({
      responderId: keyRecord.responderId,
      publicKeyBase64: keyRecord.publicKeyBase64,
      algorithm: keyRecord.algorithm,
      timestamp: keyRecord.timestamp,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch public key');
    res.status(500).json({ error: 'Key fetch failed' });
  }
});
