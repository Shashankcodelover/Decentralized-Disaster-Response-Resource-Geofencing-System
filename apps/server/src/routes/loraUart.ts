import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { LoRaUartGateway } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const loraUartRouter = Router();

const defaultGateway = new LoRaUartGateway();

const radioConfigSchema = z.object({
  frequencyMhz: z.number().min(400).max(960).default(915.0),
  spreadingFactor: z.number().min(7).max(12).default(9),
  bandwidthKhz: z.number().refine(val => [125, 250, 500].includes(val), {
    message: 'Bandwidth must be 125, 250, or 500 kHz',
  }).default(125),
  codingRate: z.enum(['4/5', '4/8']).default('4/5'),
  txPowerDbm: z.number().min(2).max(22).default(20),
});

const framePacketSchema = z.object({
  hexPayload: z.string().regex(/^[0-9a-fA-F]+$/, { message: 'Must be valid hex string' }),
});

const telemetryParseSchema = z.object({
  rawTelemetryLine: z.string().min(1),
});

/**
 * POST /api/v1/lora/uart/config
 * Reconfigures physical radio and returns modem AT command sequences.
 */
loraUartRouter.post('/config', requireAuth, validate(radioConfigSchema), (req, res) => {
  try {
    const gateway = new LoRaUartGateway(req.body);
    const atSequence = gateway.generateAtCommandSequence();
    const config = gateway.getConfig();

    logger.info({ config }, 'LoRa UART physical radio configured');
    res.json({
      success: true,
      config,
      atCommandSequence: atSequence,
      status: 'RADIO_READY'
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed to configure LoRa UART radio');
    res.status(500).json({ error: err.message || 'Radio configuration failed' });
  }
});

/**
 * POST /api/v1/lora/uart/frame
 * Encodes hex payload into SLIP-framed binary buffer with byte-stuffing.
 */
loraUartRouter.post('/frame', requireAuth, validate(framePacketSchema), (req, res) => {
  try {
    const { hexPayload } = req.body;
    const rawBuffer = Buffer.from(hexPayload, 'hex');
    const slipFrame = defaultGateway.encodeSlipFrame(new Uint8Array(rawBuffer));
    const framedHex = Buffer.from(slipFrame).toString('hex');

    res.json({
      success: true,
      originalLengthBytes: rawBuffer.length,
      slipFramedLengthBytes: slipFrame.length,
      framedHexPayload: framedHex,
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed to frame SLIP packet');
    res.status(500).json({ error: err.message || 'SLIP framing failed' });
  }
});

/**
 * POST /api/v1/lora/uart/telemetry
 * Parses modem reception telemetry line and computes signal link quality.
 */
loraUartRouter.post('/telemetry', requireAuth, validate(telemetryParseSchema), (req, res) => {
  try {
    const { rawTelemetryLine } = req.body;
    const telemetry = defaultGateway.parseRadioTelemetry(rawTelemetryLine);
    const linkEval = defaultGateway.evaluateLinkQuality(telemetry.rssiDbm, telemetry.snrDb);

    res.json({
      success: true,
      telemetry,
      linkEvaluation: linkEval,
    });
  } catch (err: any) {
    logger.error({ err }, 'Failed to parse radio telemetry');
    res.status(500).json({ error: err.message || 'Telemetry parsing failed' });
  }
});
