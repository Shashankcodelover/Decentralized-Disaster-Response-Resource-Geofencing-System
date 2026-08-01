import { z } from 'zod';

/** ─── Shared primitives ─────────────────────────────────────────────────── */

const CoordinatesSchema = z
  .tuple([z.number(), z.number()])
  .describe('GeoJSON [longitude, latitude] pair');

const GeoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: CoordinatesSchema,
});

const GeoPolygonSchema = z.object({
  type: z.literal('Polygon'),
  // At least one ring, each ring has ≥ 4 positions (first == last)
  coordinates: z.array(z.array(CoordinatesSchema).min(4)),
});

/** ─── Danger Zone schemas ───────────────────────────────────────────────── */

export const CreateZoneSchema = z.object({
  name: z.string().min(2).max(120),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  geometry: GeoPolygonSchema,
  description: z.string().max(500).optional(),
  active: z.boolean().default(true),
});

export const UpdateZoneSchema = CreateZoneSchema.partial();

/** ─── Resource Hub schemas ─────────────────────────────────────────────── */

const ResourceItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  unit: z.string().optional(),
});

export const CreateResourceHubSchema = z.object({
  name: z.string().min(2).max(120),
  location: GeoPointSchema,
  resources: z.array(ResourceItemSchema).min(1),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const UpdateResourceItemSchema = z.object({
  quantity: z.number().int().nonnegative(),
});

/** ─── Responder schemas ─────────────────────────────────────────────────── */

export const CreateResponderSchema = z.object({
  name: z.string().min(2).max(120),
  role: z.enum(['medic', 'firefighter', 'engineer', 'logistics', 'coordinator']),
  phone: z.string().optional(),
  location: GeoPointSchema.optional(),
  available: z.boolean().default(true),
});

export const UpdateResponderLocationSchema = z.object({
  coordinates: CoordinatesSchema,
});

/** ─── Geofence check schema ─────────────────────────────────────────────── */

export const GeofenceCheckSchema = z.object({
  coordinates: CoordinatesSchema,
});

/** ─── Auth schema ───────────────────────────────────────────────────────── */

export const IssueTokenSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(['admin', 'responder', 'viewer']),
  secret: z.string().min(1),
});
