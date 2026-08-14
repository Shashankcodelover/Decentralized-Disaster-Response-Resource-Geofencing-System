import { Router } from 'express';
import { getLatestSensorTelemetry, getDroneTelemetry } from '../services/iotService';
import { TelemetryLogModel } from '../models/TelemetryLog';
import { incidentTimeline } from '../services/incidentTimeline';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
import logger from '../logger';

export const iotRouter = Router();

const telemetrySchema = z.object({
  sensorId: z.string().min(1),
  type: z.enum(['water_level', 'temperature', 'structural_strain', 'air_quality', 'radiation']),
  value: z.number().finite(),
  unit: z.string().min(1),
  location: z.tuple([z.number(), z.number()]), // [lng, lat]
});

/**
 * GET /api/v1/iot/telemetry
 * Returns real-time edge sensor logs from the database, falling back to live simulator.
 */
iotRouter.get('/telemetry', requireAuth, async (_req, res) => {
  try {
    const recentLogs = await TelemetryLogModel.find()
      .sort({ timestamp: -1 })
      .limit(50);

    if (recentLogs.length > 0) {
      return res.json(recentLogs);
    }

    const fallbackData = await getLatestSensorTelemetry();
    res.json(fallbackData);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch sensor telemetry');
    res.status(500).json({ error: 'Sensor ingestion error' });
  }
});

/**
 * POST /api/v1/iot/telemetry
 * Ingests authenticated sensor telemetry, computes safety thresholds,
 * persists to MongoDB, and dispatches automated alerts if thresholds are breached.
 */
iotRouter.post('/telemetry', requireAuth, requireRole('admin', 'coordinator', 'field_agent', 'responder'), validate(telemetrySchema), async (req, res) => {
  try {
    const { sensorId, type, value, unit, location } = req.body;

    // Evaluate hazard threshold status
    let status: 'normal' | 'alert' | 'critical' = 'normal';
    if (type === 'radiation') {
      if (value > 5.0) status = 'critical';
      else if (value > 1.0) status = 'alert';
    } else if (type === 'air_quality') {
      if (value > 300) status = 'critical';
      else if (value > 150) status = 'alert';
    } else if (type === 'temperature') {
      if (value > 50.0 || value < -20.0) status = 'critical';
      else if (value > 40.0 || value < 0.0) status = 'alert';
    } else if (type === 'water_level') {
      if (value > 3.0) status = 'critical';
      else if (value > 1.5) status = 'alert';
    } else if (type === 'structural_strain') {
      if (value > 85.0) status = 'critical';
      else if (value > 60.0) status = 'alert';
    }

    // Persist to MongoDB
    const logDoc = await TelemetryLogModel.create({
      sensorId,
      type,
      value,
      unit,
      location,
      status,
      timestamp: new Date(),
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('iot:telemetry', logDoc);
      if (status !== 'normal') {
        io.emit('iot:alert', { sensorId, type, value, status, location });
      }
    }

    // Record to immutable incident blockchain timeline if threshold exceeded
    if (status !== 'normal') {
      await incidentTimeline.record(
        'SENSOR_ALERT',
        status === 'critical' ? 'critical' : 'warning',
        req.user?.sub || sensorId,
        `Sensor ${sensorId} breached ${status} threshold with value ${value} ${unit}`,
        { sensorId, type, value, unit, location, status }
      );
    }

    logger.info({ sensorId, type, status, value }, 'Telemetry ingested & evaluated');
    res.status(201).json(logDoc);
  } catch (err) {
    logger.error({ err }, 'Failed to ingest sensor telemetry');
    res.status(500).json({ error: 'Sensor ingestion error' });
  }
});

/**
 * GET /api/v1/iot/drones
 * Returns tracking metrics for autonomous search and rescue drone fleets.
 */
iotRouter.get('/drones', requireAuth, async (_req, res) => {
  try {
    const data = await getDroneTelemetry();
    res.json(data);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch drone telemetry');
    res.status(500).json({ error: 'Drone telemetry error' });
  }
});

