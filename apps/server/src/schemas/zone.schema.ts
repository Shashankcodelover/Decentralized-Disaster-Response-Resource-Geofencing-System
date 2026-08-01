import { z } from 'zod';

/**
 * GeoJSON Polygon coordinate ring: array of [lng, lat] pairs.
 * Minimum 4 points (first === last to close the ring).
 */
const coordinateRing = z.array(z.tuple([z.number(), z.number()])).min(4);

const geoPolygon = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(coordinateRing).min(1),
});

/** POST /api/v1/zones — create a new danger zone */
export const createZoneSchema = z.object({
  name: z.string().min(1, 'Zone name is required').max(200),
  description: z.string().max(2000).optional(),
  geometry: geoPolygon,
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  active: z.boolean().default(true),
});

/** PUT /api/v1/zones/:id — update an existing danger zone */
export const updateZoneSchema = createZoneSchema.partial();

/** GET /api/v1/zones?bbox=minLng,minLat,maxLng,maxLat */
export const zoneQuerySchema = z.object({
  bbox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'bbox must be minLng,minLat,maxLng,maxLat')
    .optional(),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export type ZoneQueryInput = z.infer<typeof zoneQuerySchema>;
