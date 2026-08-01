import { z } from 'zod';

const geoPoint = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
});

const resourceItem = z.object({
  category: z.enum(['food', 'medical', 'personnel', 'equipment']),
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0),
  unit: z.string().min(1).max(50),
});

/** POST /api/v1/resources — create a new resource hub */
export const createResourceSchema = z.object({
  name: z.string().min(1, 'Hub name is required').max(200),
  location: geoPoint,
  address: z.string().max(500).optional(),
  capacity: z.number().int().min(1),
  resources: z.array(resourceItem).default([]),
});

/** PATCH /api/v1/resources/:hubId/items/:itemId — update stock */
export const updateStockSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

/** GET /api/v1/resources?lng=&lat=&maxDistance= */
export const resourceQuerySchema = z.object({
  lng: z.coerce.number().optional(),
  lat: z.coerce.number().optional(),
  maxDistance: z.coerce.number().positive().optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type ResourceQueryInput = z.infer<typeof resourceQuerySchema>;
