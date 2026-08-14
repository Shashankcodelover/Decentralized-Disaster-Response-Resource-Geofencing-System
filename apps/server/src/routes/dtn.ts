import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { DTNBundleStore, DTNBundle } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const dtnRouter = Router();

// Server-side Bundle Store acting as a DTN Gateway
const gatewayStore = new DTNBundleStore(5000);

const bundleSchema = z.object({
  bundleId: z.string().min(1),
  sourceNodeId: z.string().min(1),
  destinationNodeId: z.string().min(1),
  creationTimestamp: z.number().positive(),
  ttlMs: z.number().positive(),
  hopCount: z.number().int().min(0),
  maxHops: z.number().int().min(1).default(10),
  payloadType: z.enum(['SOS_BEACON', 'CASUALTY_REPORT', 'SUPPLY_MANIFEST', 'TACTICAL_ORDER', 'CUSTOM']),
  payload: z.union([z.record(z.string(), z.any()), z.string()]),
});

const syncSchema = z.object({
  nodeId: z.string().min(1),
  inventoryBundleIds: z.array(z.string()),
  carriedBundles: z.array(bundleSchema).optional(),
});

/**
 * POST /api/v1/dtn/bundles
 * Ingests a new store-and-forward bundle into the gateway store.
 */
dtnRouter.post('/bundles', requireAuth, validate(bundleSchema), async (req, res) => {
  try {
    const bundle = req.body as DTNBundle;
    const accepted = gatewayStore.ingestBundle(bundle, 'gateway-server');

    if (accepted) {
      const io = req.app.get('io');
      if (io) {
        io.emit('dtn:bundle:ingested', bundle);
      }
      logger.info({ bundleId: bundle.bundleId, source: bundle.sourceNodeId }, 'DTN bundle ingested at gateway');
      return res.status(201).json({ success: true, bundleId: bundle.bundleId, status: 'STORED' });
    }

    res.status(200).json({ success: false, bundleId: bundle.bundleId, status: 'REJECTED_OR_DUPLICATE' });
  } catch (err) {
    logger.error({ err }, 'DTN bundle ingestion failed');
    res.status(500).json({ error: 'Failed to ingest DTN bundle' });
  }
});

/**
 * POST /api/v1/dtn/sync
 * Anti-entropy bundle synchronization with an arriving mobile Data Mule.
 */
dtnRouter.post('/sync', requireAuth, validate(syncSchema), async (req, res) => {
  try {
    const { nodeId, inventoryBundleIds, carriedBundles } = req.body;

    // Ingest any bundles the mule brought
    let newlyIngestedCount = 0;
    if (carriedBundles && carriedBundles.length > 0) {
      for (const b of carriedBundles) {
        if (gatewayStore.ingestBundle(b, 'gateway-server')) {
          newlyIngestedCount++;
        }
      }
    }

    // Reconcile and find bundles to give back to mule
    const { bundlesToOffer, neededBundleIds } = gatewayStore.reconcileWithPeer(inventoryBundleIds, nodeId);

    res.json({
      success: true,
      nodeId,
      gatewayStoreSize: gatewayStore.getStoreCount(),
      newlyIngestedCount,
      bundlesToOffer,
      neededBundleIds,
    });
  } catch (err) {
    logger.error({ err }, 'DTN sync failed');
    res.status(500).json({ error: 'DTN sync error' });
  }
});

/**
 * GET /api/v1/dtn/bundles
 * Returns all active non-expired bundles in the gateway store.
 */
dtnRouter.get('/bundles', requireAuth, async (_req, res) => {
  try {
    const active = gatewayStore.getActiveBundles();
    res.json({
      count: active.length,
      bundles: active,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch DTN bundles');
    res.status(500).json({ error: 'Fetch bundles error' });
  }
});
