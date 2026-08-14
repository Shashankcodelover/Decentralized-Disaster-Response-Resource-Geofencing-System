import { Schema, model, Document } from 'mongoose';

export interface IPublicKey extends Document {
  responderId: string;
  publicKeyBase64: string; // The ECDH or RSA public key
  algorithm: string; // e.g., 'ECDH-P256'
  timestamp: Date;
}

const publicKeySchema = new Schema<IPublicKey>(
  {
    responderId: { type: String, required: true, unique: true },
    publicKeyBase64: { type: String, required: true },
    algorithm: { type: String, required: true, default: 'ECDH-P256' },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const PublicKeyModel = model<IPublicKey>('PublicKey', publicKeySchema);
