import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { DangerZoneModel } from '../models/DangerZone';
import { ResourceHubModel } from '../models/ResourceHub';
import {
  findSafestEvacuationRoute,
  RoadIntersection,
  RoadSegment,
} from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const evacuationRouter = Router();

const evacuationQuerySchema = z.object({
  startCoordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
  targetShelterId: z.string().optional(),
});

/**
 * POST /api/v1/evacuation/route
 * Computes safest dynamic evacuation path avoiding active hazard zones.
 */
evacuationRouter.post('/route', requireAuth, validate(evacuationQuerySchema), async (req, res) => {
  try {
    const { startCoordinates, targetShelterId } = req.body;
    const [startLng, startLat] = startCoordinates;

    const [hubs, zones] = await Promise.all([
      ResourceHubModel.find(),
      DangerZoneModel.find({ active: { $ne: false } }),
    ]);

    // Construct disaster road graph nodes from hubs and start position
    const nodes: RoadIntersection[] = [
      {
        nodeId: 'start-point',
        name: 'Evacuee Location',
        lat: startLat,
        lng: startLng,
      },
    ];

    hubs.forEach(h => {
      if (h.location?.coordinates?.length === 2) {
        nodes.push({
          nodeId: h._id.toString(),
          name: h.name,
          lat: h.location.coordinates[1],
          lng: h.location.coordinates[0],
          isShelter: true,
          shelterCapacity: 500,
        });
      }
    });

    // Synthesize road segment edges between nodes
    const edges: RoadSegment[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        // Haversine distance
        const dLat = (n2.lat - n1.lat) * Math.PI / 180;
        const dLon = (n2.lng - n1.lng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(n1.lat * Math.PI / 180) * Math.cos(n2.lat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const distKm = parseFloat((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));

        // Evaluate hazard exposure along the edge
        let hazardExposure = 0.0;
        const midLng = (n1.lng + n2.lng) / 2;
        const midLat = (n1.lat + n2.lat) / 2;

        for (const z of zones) {
          const zRing = z.geometry?.coordinates?.[0];
          if (zRing && zRing.length > 0) {
            const zCentroid = zRing[0];
            const zDistKm = 6371 * Math.acos(
              Math.sin(midLat * Math.PI / 180) * Math.sin(zCentroid[1] * Math.PI / 180) +
              Math.cos(midLat * Math.PI / 180) * Math.cos(zCentroid[1] * Math.PI / 180) *
              Math.cos((zCentroid[0] - midLng) * Math.PI / 180)
            );
            if (zDistKm < 1.0) {
              hazardExposure = z.severity === 'critical' ? 1.0 : 0.6;
            }
          }
        }

        edges.push({
          edgeId: `edge-${n1.nodeId}-${n2.nodeId}`,
          fromNodeId: n1.nodeId,
          toNodeId: n2.nodeId,
          distanceKm: distKm,
          damageFactor: hazardExposure > 0.8 ? 2.0 : 0.0,
          isPassable: hazardExposure < 0.95,
          activeHazardExposure: hazardExposure,
          congestionPenalty: 0.2,
        });
      }
    }

    const plan = findSafestEvacuationRoute('start-point', nodes, edges, targetShelterId);

    if (!plan) {
      return res.status(404).json({ error: 'No safe evacuation path found to designated shelters' });
    }

    logger.info({ shelter: plan.targetShelter?.name, distanceKm: plan.totalDistanceKm, score: plan.safetyScore }, 'Evacuation route solved');
    res.json(plan);
  } catch (err) {
    logger.error({ err }, 'Evacuation path calculation failed');
    res.status(500).json({ error: 'Evacuation router error' });
  }
});
