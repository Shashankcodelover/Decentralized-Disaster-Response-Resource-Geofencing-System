import { Router } from 'express';
import { MessageModel } from '../models/Message';
import { PublicKeyModel } from '../models/PublicKey';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import logger from '../logger';

export const commsRouter = Router();

const createMessageSchema = z.object({
  senderId: z.string().optional(),
  senderName: z.string().min(1).default('Field Agent'),
  zoneId: z.string().min(1),
  content: z.string().min(1), // E2E encrypted ciphertext (base64)
  encryptionMetadata: z.object({
    iv: z.string().min(1),
    authTag: z.string().min(1),
  }),
  priority: z.enum(['critical', 'status', 'normal']).default('normal'),
});

/**
 * GET /api/v1/comms/messages/:zoneId
 * Returns recent messages in a zone channel feed.
 * Requires authentication to prevent unauthorized surveillance.
 */
commsRouter.get('/messages/:zoneId', requireAuth, async (req, res) => {
  try {
    const messages = await MessageModel.find({ zoneId: req.params.zoneId, isDirect: { $ne: true } })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(messages.reverse()); // return chronological order
  } catch (err) {
    logger.error({ err, zoneId: req.params.zoneId }, 'Failed to fetch messages');
    res.status(500).json({ error: 'Failed to fetch communications feed' });
  }
});

/**
 * POST /api/v1/comms/messages
 * Submits and relays a new priority communication.
 * REQUIRES AUTHENTICATION — the senderId is enforced from the JWT token,
 * preventing identity spoofing of field commanders.
 */
commsRouter.post('/messages', requireAuth, validate(createMessageSchema), async (req, res) => {
  try {
    // Override senderId with authenticated user's identity to prevent spoofing
    const authenticatedSenderId = req.user!.sub;
    const msgData = {
      ...req.body,
      senderId: authenticatedSenderId,
      isDirect: false,
    };

    const msg = await MessageModel.create(msgData);
    const io = req.app.get('io');
    if (io) {
      // Broadcast to socket subscribers
      io.emit(`zone:${req.body.zoneId}:message`, msg);
    }
    logger.info({ messageId: msg._id, zoneId: msg.zoneId, sender: authenticatedSenderId }, 'Comms message posted and relayed');
    res.status(201).json(msg);
  } catch (err) {
    logger.error({ err }, 'Message submit failed');
    res.status(400).json({ error: 'Failed to broadcast message' });
  }
});

/**
 * POST /api/v1/comms/direct
 * Submits, persists, and relays a direct E2EE message to a specific responder.
 * Persists the message in MongoDB so offline responders receive it upon reconnecting.
 */
const directMessageSchema = z.object({
  targetResponderId: z.string().min(1),
  senderName: z.string().optional().default('Field Agent'),
  content: z.string().min(1), // E2E encrypted ciphertext (base64)
  encryptionMetadata: z.object({
    iv: z.string().min(1),
    authTag: z.string().min(1),
  }),
  priority: z.enum(['critical', 'status', 'normal']).default('normal'),
});

commsRouter.post('/direct', requireAuth, validate(directMessageSchema), async (req, res) => {
  try {
    const authenticatedSenderId = req.user!.sub;
    const { targetResponderId, senderName, content, encryptionMetadata, priority } = req.body;
    
    // Persist direct message to MongoDB for durability & offline inbox sync
    const savedMsg = await MessageModel.create({
      senderId: authenticatedSenderId,
      senderName: senderName || 'Field Agent',
      targetResponderId,
      isDirect: true,
      content,
      encryptionMetadata,
      priority: priority || 'normal',
      timestamp: new Date(),
    });

    const io = req.app.get('io');
    if (io) {
      // Broadcast specifically to the target, and back to the sender
      io.emit(`comms:direct:${targetResponderId}`, savedMsg);
      io.emit(`comms:direct:${authenticatedSenderId}`, savedMsg);
    }
    
    logger.info({ messageId: savedMsg._id, sender: authenticatedSenderId, target: targetResponderId }, 'Direct E2EE message persisted & relayed');
    res.status(201).json(savedMsg);
  } catch (err) {
    logger.error({ err }, 'Direct message submit failed');
    res.status(400).json({ error: 'Failed to send direct message' });
  }
});

/**
 * GET /api/v1/comms/direct/:targetResponderId
 * Retrieves chronological direct message conversation history with a peer.
 */
commsRouter.get('/direct/:targetResponderId', requireAuth, async (req, res) => {
  try {
    const myId = req.user!.sub;
    const targetId = req.params.targetResponderId;

    const messages = await MessageModel.find({
      isDirect: true,
      $or: [
        { senderId: myId, targetResponderId: targetId },
        { senderId: targetId, targetResponderId: myId },
      ],
    })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(messages.reverse());
  } catch (err) {
    logger.error({ err, target: req.params.targetResponderId }, 'Failed to fetch direct messages');
    res.status(500).json({ error: 'Failed to fetch direct messages' });
  }
});

const publicKeySchema = z.object({
  publicKeyBase64: z.string().min(1),
  algorithm: z.string().default('ECDH-P256'),
});

/**
 * POST /api/v1/comms/keys
 * Publish public key for authenticated responder.
 */
commsRouter.post('/keys', requireAuth, validate(publicKeySchema), async (req, res) => {
  try {
    const responderId = req.user!.sub;
    const { publicKeyBase64, algorithm } = req.body;

    const keyRecord = await PublicKeyModel.findOneAndUpdate(
      { responderId },
      { publicKeyBase64, algorithm, timestamp: new Date() },
      { upsert: true, new: true }
    );

    logger.info({ responderId }, 'Public key published on comms');
    res.status(200).json({ success: true, key: keyRecord });
  } catch (err) {
    logger.error({ err }, 'Failed to publish key on comms');
    res.status(500).json({ error: 'Failed to publish public key' });
  }
});

/**
 * GET /api/v1/comms/keys/:responderId
 * Fetch public key of target responder for E2EE key agreement.
 */
commsRouter.get('/keys/:responderId', requireAuth, async (req, res) => {
  try {
    const keyRecord = await PublicKeyModel.findOne({ responderId: req.params.responderId });
    if (!keyRecord) {
      return res.status(404).json({ error: 'Public key not found for responder' });
    }
    res.json({
      responderId: keyRecord.responderId,
      publicKeyBase64: keyRecord.publicKeyBase64,
      algorithm: keyRecord.algorithm,
      timestamp: keyRecord.timestamp,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch public key');
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});
