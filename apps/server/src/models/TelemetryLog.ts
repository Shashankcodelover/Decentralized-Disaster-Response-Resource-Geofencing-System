import { Schema, model, Document } from 'mongoose';

export interface ITelemetryLog extends Document {
  sensorId: string;
  type: 'water_level' | 'temperature' | 'structural_strain' | 'air_quality' | 'radiation';
  value: number;
  unit: string;
  location: [number, number]; // [lng, lat] GeoJSON convention
  status: 'normal' | 'alert' | 'critical';
  timestamp: Date;
}

const telemetryLogSchema = new Schema<ITelemetryLog>(
  {
    sensorId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['water_level', 'temperature', 'structural_strain', 'air_quality', 'radiation'],
      required: true,
    },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    location: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]),
        message: 'Location must be a [lng, lat] coordinate pair',
      },
    },
    status: {
      type: String,
      enum: ['normal', 'alert', 'critical'],
      default: 'normal',
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Indexing for rapid queries per sensor and time ranges
telemetryLogSchema.index({ sensorId: 1, timestamp: -1 });
telemetryLogSchema.index({ type: 1, status: 1 });

export const TelemetryLogModel = model<ITelemetryLog>('TelemetryLog', telemetryLogSchema);
