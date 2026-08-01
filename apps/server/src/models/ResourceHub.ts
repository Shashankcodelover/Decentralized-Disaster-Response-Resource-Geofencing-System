import { Schema, model } from 'mongoose';
import type { ResourceHub } from '@mirage/shared-types';

const resourceItemSchema = new Schema({
  category: { type: String, enum: ['food', 'medical', 'personnel', 'equipment'], required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

const resourceHubSchema = new Schema<ResourceHub>(
  {
    name: { type: String, required: true },
    location: {
      type: { type: String, enum: ['Point'], required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: String,
    capacity: { type: Number, required: true },
    resources: [resourceItemSchema],
  },
  { timestamps: true }
);

// 2dsphere index for proximity queries
resourceHubSchema.index({ location: '2dsphere' });

export const ResourceHubModel = model<ResourceHub>('ResourceHub', resourceHubSchema);
