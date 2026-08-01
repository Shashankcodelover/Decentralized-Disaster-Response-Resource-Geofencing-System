import { z } from 'zod';

/** POST /api/v1/responders — register a new responder */
export const createResponderSchema = z.object({
  name: z.string().min(1, 'Responder name is required').max(200),
  role: z.enum(['coordinator', 'field_agent', 'volunteer']),
  online: z.boolean().default(false),
});

/** PATCH /api/v1/responders/:id/location — GPS position update */
export const updateLocationSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),  // [lng, lat]
});

/** POST /api/v1/geofence/check — point-in-polygon check */
export const geofenceCheckSchema = z.object({
  coordinates: z.tuple([z.number(), z.number()]),  // [lng, lat]
});

export type CreateResponderInput = z.infer<typeof createResponderSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type GeofenceCheckInput = z.infer<typeof geofenceCheckSchema>;
