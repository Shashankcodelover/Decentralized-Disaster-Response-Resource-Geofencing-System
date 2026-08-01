import { Router } from 'express';
import { getLatestSensorTelemetry, getDroneTelemetry } from '../services/iotService';
import logger from '../logger';

export const iotRouter = Router();

/**
 * GET /api/v1/iot/telemetry
 * Returns real-time edge sensor logs.
 */
iotRouter.get('/telemetry', async (_req, res) => {
  try {
    const data = await getLatestSensorTelemetry();
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch sensor telemetry');
    res.status(500).json({ error: 'Sensor ingestion error' });
  }
});

/**
 * GET /api/v1/iot/drones
 * Returns tracking metrics for autonomous search and rescue drone fleets.
 */
iotRouter.get('/drones', async (_req, res) => {
  try {
    const data = await getDroneTelemetry();
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch drone telemetry');
    res.status(500).json({ error: 'Drone telemetry error' });
  }
});
