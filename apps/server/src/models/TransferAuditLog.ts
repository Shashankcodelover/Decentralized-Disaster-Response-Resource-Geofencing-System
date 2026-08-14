import { Schema, model, Document } from 'mongoose';

export interface ITransferAuditLog extends Document {
  transferId: string;
  timestamp: Date;
  request: {
    sourceHubId: string;
    destinationHubId: string;
    itemName: string;
    quantity: number;
    requestedBy: string;
    priority: 'routine' | 'urgent' | 'emergency';
    reason: string;
  };
  result: {
    success: boolean;
    error?: string;
    auditChecksum?: string;
    sourceRemaining?: number;
    destinationTotal?: number;
  };
  checksum: string;
}

const transferAuditLogSchema = new Schema<ITransferAuditLog>(
  {
    transferId: { type: String, required: true, unique: true },
    timestamp: { type: Date, required: true, default: Date.now },
    request: {
      sourceHubId: { type: String, required: true },
      destinationHubId: { type: String, required: true },
      itemName: { type: String, required: true },
      quantity: { type: Number, required: true },
      requestedBy: { type: String, required: true },
      priority: { type: String, enum: ['routine', 'urgent', 'emergency'], required: true },
      reason: { type: String, required: true },
    },
    result: {
      success: { type: Boolean, required: true },
      error: { type: String },
      auditChecksum: { type: String },
      sourceRemaining: { type: Number },
      destinationTotal: { type: Number },
    },
    checksum: { type: String, required: true },
  },
  { timestamps: true }
);

transferAuditLogSchema.index({ timestamp: -1 });

export const TransferAuditLogModel = model<ITransferAuditLog>('TransferAuditLog', transferAuditLogSchema);
