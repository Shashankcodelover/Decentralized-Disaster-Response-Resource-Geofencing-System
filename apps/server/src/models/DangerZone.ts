import { Schema, model } from 'mongoose';
import type { DangerZone } from '@mirage/shared-types';

const dangerZoneSchema = new Schema<DangerZone>(
  {
    name: { type: String, required: true },
    description: String,
    geometry: {
      type: { type: String, enum: ['Polygon'], required: true },
      coordinates: { type: [[[Number]]], required: true },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries
dangerZoneSchema.index({ geometry: '2dsphere' });

export const DangerZoneModel = model<DangerZone>('DangerZone', dangerZoneSchema);
