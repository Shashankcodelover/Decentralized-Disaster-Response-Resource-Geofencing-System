import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { PqcHybridSigner } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const pqcRouter = Router();

const defaultPqcSigner = new PqcHybridSigner();

const generateKeySchema = z.object({
  keyId: z.string().min(1).default(() => `pqc_key_${Date.now()}`),
});

const signPayloadSchema = z.object({
  payload: z.union([z.record(z.string(), z.any()), z.string()]),
  keyPair: z.object({
    keyId: z.string(),
    classicalPublicKeyHex: z.string(),
    classicalPrivateKeyHex: z.string(),
    quantumLatticeSeedHex: z.string(),
    creationTimestamp: z.number(),
  }),
});

const verifyPacketSchema = z.object({
  payload: z.union([z.record(z.string(), z.any()), z.string()]),
  packet: z.object({
    packetId: z.string(),
    payloadHash: z.string(),
    classicalSignature: z.string(),
    latticeCommitmentHash: z.string(),
    epochSalt: z.string(),
    nonce: z.number(),
    signerKeyId: z.string(),
    timestamp: z.number(),
  }),
  classicalPrivateKeyOrSecret: z.string().min(1),
  quantumLatticeSeedHex: z.string().optional(),
});

/**
 * POST /api/v1/security/pqc/keys
 * Generates a post-quantum hybrid classical + lattice seed keypair.
 */
pqcRouter.post('/keys', requireAuth, validate(generateKeySchema), (req, res) => {
  try {
    const keyPair = defaultPqcSigner.generateHybridKeyPair(req.body.keyId);
    res.json({
      success: true,
      keyPair,
    });
  } catch (err: any) {
    logger.error({ err }, 'PQC key generation failed');
    res.status(500).json({ error: err.message || 'Key generation failed' });
  }
});

/**
 * POST /api/v1/security/pqc/sign
 * Signs a mission payload with classical HMAC + lattice commitment hashes.
 */
pqcRouter.post('/sign', requireAuth, validate(signPayloadSchema), (req, res) => {
  try {
    const { payload, keyPair } = req.body;
    const signedPacket = defaultPqcSigner.signPayload(payload, keyPair);

    res.json({
      success: true,
      signedPacket,
    });
  } catch (err: any) {
    logger.error({ err }, 'PQC signing failed');
    res.status(500).json({ error: err.message || 'Signing failed' });
  }
});

/**
 * POST /api/v1/security/pqc/verify
 * Verifies payload integrity, classical signature, lattice commitment, and anti-replay nonce.
 */
pqcRouter.post('/verify', requireAuth, validate(verifyPacketSchema), (req, res) => {
  try {
    const { payload, packet, classicalPrivateKeyOrSecret, quantumLatticeSeedHex } = req.body;
    const result = defaultPqcSigner.verifySignedPacket(
      payload,
      packet,
      classicalPrivateKeyOrSecret,
      quantumLatticeSeedHex
    );

    res.json({
      success: true,
      verification: result,
    });
  } catch (err: any) {
    logger.error({ err }, 'PQC verification failed');
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});
