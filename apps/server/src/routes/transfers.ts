/**
 * Resource Transfer & Incident Timeline API Routes
 * 
 * Exposes the new resource transfer protocol and the incident timeline
 * query system as authenticated REST endpoints.
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';
import { executeResourceTransfer, getTransferAuditLog } from '../services/resourceTransferService';
import { incidentTimeline } from '../services/incidentTimeline';
import logger from '../logger';

export const transferRouter = Router();
export const timelineRouter = Router();

// ═══════════════════════════════════════
// RESOURCE TRANSFER ROUTES
// ═══════════════════════════════════════

const transferSchema = z.object({
  sourceHubId: z.string().min(1),
  destinationHubId: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().positive().finite(),
  priority: z.enum(['routine', 'urgent', 'emergency']).default('routine'),
  reason: z.string().min(1).max(500),
});

/**
 * POST /api/v1/transfers
 * Execute a resource transfer between hubs.
 * Requires coordinator or admin role.
 */
transferRouter.post('/', requireAuth, requireRole('admin', 'coordinator'), validate(transferSchema), async (req, res) => {
  try {
    const result = await executeResourceTransfer({
      ...req.body,
      requestedBy: req.user!.sub,
    });

    if (result.success) {
      // Record in incident timeline
      incidentTimeline.record(
        'RESOURCE_TRANSFER',
        req.body.priority === 'emergency' ? 'critical' : 'info',
        req.user!.sub,
        `Transferred ${req.body.quantity} × "${req.body.itemName}" from hub ${req.body.sourceHubId} to ${req.body.destinationHubId}`,
        { transferId: result.transferId, ...req.body }
      );

      // Broadcast via socket
      const io = req.app.get('io');
      if (io) {
        io.emit('resource:transfer', {
          transferId: result.transferId,
          sourceHubId: req.body.sourceHubId,
          destinationHubId: req.body.destinationHubId,
          itemName: req.body.itemName,
          quantity: req.body.quantity,
        });
      }

      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    logger.error({ err }, 'Transfer route error');
    res.status(500).json({ error: 'Internal error processing transfer' });
  }
});

/**
 * GET /api/v1/transfers/audit
 * Returns the recent transfer audit log.
 */
transferRouter.get('/audit', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(await getTransferAuditLog(limit));
});

// ═══════════════════════════════════════
// INCIDENT TIMELINE ROUTES
// ═══════════════════════════════════════

/**
 * GET /api/v1/timeline
 * Query the incident timeline with optional filters.
 */
timelineRouter.get('/', requireAuth, async (req, res) => {
  const events = await incidentTimeline.query({
    limit: Math.min(Number(req.query.limit) || 100, 500),
    type: req.query.type as any,
    severity: req.query.severity as any,
    since: req.query.since as string | undefined,
  });
  res.json(events);
});

/**
 * GET /api/v1/timeline/summary
 * Returns summary statistics and chain integrity status.
 */
timelineRouter.get('/summary', requireAuth, async (_req, res) => {
  res.json(await incidentTimeline.getSummary());
});

/**
 * GET /api/v1/timeline/verify
 * Verifies the cryptographic chain integrity of the incident timeline.
 */
timelineRouter.get('/verify', requireAuth, requireRole('admin', 'coordinator'), async (_req, res) => {
  const result = await incidentTimeline.verifyChainIntegrity();
  res.json(result);
});
