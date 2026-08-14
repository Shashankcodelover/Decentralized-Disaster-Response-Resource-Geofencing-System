import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ResponderModel } from '../models/Responder';
import { DangerZoneModel } from '../models/DangerZone';
import { serializeCoTToXml, parseCoTFromXml, getCoTTypeForEntity, CoTEvent } from '@mirage/crdt-logic';
import logger from '../logger';

export const cotRouter = Router();

/**
 * GET /api/v1/cot/feed
 * Returns all active responders and danger zones formatted as Cursor on Target (CoT) XML events.
 * Used by ATAK, WinTAK, and TAK Server plugins for real-time map synchronization.
 */
cotRouter.get('/feed', requireAuth, async (req, res) => {
  try {
    const [responders, zones] = await Promise.all([
      ResponderModel.find(),
      DangerZoneModel.find({ active: { $ne: false } }),
    ]);

    const cotEvents: CoTEvent[] = [];
    const now = new Date();
    const stale = new Date(now.getTime() + 180_000).toISOString();

    // Map Responders to CoT
    for (const r of responders) {
      if (r.location?.coordinates && r.location.coordinates.length === 2) {
        cotEvents.push({
          uid: `responder-${r._id}`,
          type: getCoTTypeForEntity('responder'),
          how: 'm-g',
          time: now.toISOString(),
          start: now.toISOString(),
          stale,
          point: {
            lat: r.location.coordinates[1],
            lon: r.location.coordinates[0],
            hae: 0,
            ce: 5.0,
            le: 5.0,
          },
          callsign: r.name,
          detail: {
            status: r.online ? 'online' : 'offline',
            role: r.role,
          },
        });
      }
    }

    // Map Danger Zones to CoT
    for (const z of zones) {
      const ring = z.geometry?.coordinates?.[0];
      if (ring && ring.length > 0) {
        const centroid = ring[0]; // representative point
        cotEvents.push({
          uid: `zone-${z._id}`,
          type: getCoTTypeForEntity('danger_zone'),
          how: 'h-e',
          time: now.toISOString(),
          start: now.toISOString(),
          stale,
          point: {
            lat: centroid[1],
            lon: centroid[0],
            hae: 0,
            ce: 50.0,
            le: 50.0,
          },
          callsign: `HAZARD-${z.name}`,
          detail: {
            severity: z.severity,
            status: z.active ? 'active' : 'inactive',
            polygonVertices: ring.length,
          },
        });
      }
    }

    // Check requested format: XML or JSON
    const wantsXml = req.headers.accept?.includes('xml') || req.query.format === 'xml';
    if (wantsXml) {
      const xmlPayload =
        `<?xml version="1.0" encoding="UTF-8"?>\n<cotMessage version="2.0">\n` +
        cotEvents.map(e => serializeCoTToXml(e)).join('\n') +
        `\n</cotMessage>`;
      res.setHeader('Content-Type', 'application/xml');
      return res.send(xmlPayload);
    }

    res.json({
      count: cotEvents.length,
      events: cotEvents,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to generate CoT feed');
    res.status(500).json({ error: 'CoT feed generation failed' });
  }
});

/**
 * POST /api/v1/cot/inbound
 * Ingests raw Cursor on Target (CoT) XML from external ATAK / WinTAK radios.
 */
cotRouter.post('/inbound', requireAuth, async (req, res) => {
  try {
    const rawXml = typeof req.body === 'string' ? req.body : req.body?.xml;
    if (!rawXml) {
      return res.status(400).json({ error: 'Missing raw CoT XML payload' });
    }

    const parsed = parseCoTFromXml(rawXml);
    if (!parsed) {
      return res.status(400).json({ error: 'Invalid or malformed Cursor on Target XML' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('cot:event', parsed);
    }

    logger.info({ uid: parsed.uid, type: parsed.type, callsign: parsed.callsign }, 'Ingested inbound CoT event');
    res.status(201).json({ success: true, parsed });
  } catch (err) {
    logger.error({ err }, 'Inbound CoT ingestion failed');
    res.status(500).json({ error: 'Inbound CoT error' });
  }
});
