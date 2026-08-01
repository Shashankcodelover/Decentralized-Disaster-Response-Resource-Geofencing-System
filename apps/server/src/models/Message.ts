import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  senderName: string;
  zoneId: string; // group channel per zone
  content: string; // base64 / encrypted text string
  priority: 'critical' | 'status' | 'normal';
  timestamp: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    zoneId: { type: String, required: true },
    content: { type: String, required: true },
    priority: {
      type: String,
      enum: ['critical', 'status', 'normal'],
      default: 'normal',
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexing for rapid feed fetching per zone order by time
messageSchema.index({ zoneId: 1, timestamp: -1 });

export const MessageModel = model<IMessage>('Message', messageSchema);
