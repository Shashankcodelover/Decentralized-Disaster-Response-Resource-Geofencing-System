import { Schema, model, Document } from 'mongoose';

export interface IIncidentEvent extends Document {
  eventId: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  actorId: string;
  description: string;
  metadata?: any;
  timestamp: Date;
  previousHash: string;
  hash: string;
}

const incidentEventSchema = new Schema<IIncidentEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], required: true },
    actorId: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true },
    previousHash: { type: String, required: true },
    hash: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

incidentEventSchema.index({ timestamp: -1 });

export const IncidentEventModel = model<IIncidentEvent>('IncidentEvent', incidentEventSchema);

