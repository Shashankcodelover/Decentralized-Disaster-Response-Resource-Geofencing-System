import { Schema, model } from 'mongoose';
import type { Responder } from '@mirage/shared-types';

const responderSchema = new Schema<Responder>(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ['coordinator', 'field_agent', 'volunteer'], required: true },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: [Number],
    },
    online: { type: Boolean, default: false },
  },
  { timestamps: true }
);

responderSchema.index({ location: '2dsphere' });

export const ResponderModel = model<Responder>('Responder', responderSchema);
