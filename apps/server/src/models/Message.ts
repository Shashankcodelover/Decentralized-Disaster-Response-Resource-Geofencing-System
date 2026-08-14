import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  senderName: string;
  zoneId?: string; // group channel per zone
  targetResponderId?: string; // for direct 1-on-1 responder comms
  isDirect: boolean;
  content: string; // E2E encrypted ciphertext (base64)
  encryptionMetadata: {
    iv: string; // initialization vector (base64)
    authTag: string; // authentication tag (base64)
  };
  priority: 'critical' | 'status' | 'normal';
  timestamp: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true, default: 'Field Agent' },
    zoneId: { type: String, required: false },
    targetResponderId: { type: String, required: false },
    isDirect: { type: Boolean, default: false },
    content: { type: String, required: true },
    encryptionMetadata: {
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },
    priority: {
      type: String,
      enum: ['critical', 'status', 'normal'],
      default: 'normal',
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexing for rapid feed fetching per zone and direct messaging threads
messageSchema.index({ zoneId: 1, timestamp: -1 });
messageSchema.index({ targetResponderId: 1, senderId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1, timestamp: -1 });

export const MessageModel = model<IMessage>('Message', messageSchema);

