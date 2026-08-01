import { Router } from 'express';
import { ResponderModel } from '../models/Responder';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { createResponderSchema, updateLocationSchema } from '../schemas/responder.schema';
import logger from '../logger';

export const respondersRouter = Router();

respondersRouter.get('/', async (_req, res) => {
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
