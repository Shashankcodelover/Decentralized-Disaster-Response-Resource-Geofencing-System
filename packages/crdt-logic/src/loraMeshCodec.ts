/**
 * Ultra-Compact LoRa 24-Byte Binary Mesh Codec
 * 
 * Compresses disaster response telemetry into 24-byte binary frames
 * optimized for low-bandwidth LoRa radio transceivers (868/915 MHz, 250 bps - 5 kbps).
 * 
 * Frame Layout (24 bytes):
 * - Byte 0: Packet Header (Type: 4 bits, Priority: 4 bits)
 * - Bytes 1-4: Node / Beacon ID Hash (32-bit uint)
 * - Bytes 5-7: 24-bit Quantized Longitude ([-180, 180] -> 2^24 buckets, ~1m resolution)
 * - Bytes 8-10: 24-bit Quantized Latitude ([-90, 90] -> 2^24 buckets, ~1m resolution)
 * - Byte 11: Battery Level (0-100%)
 * - Byte 12: Triage Tag (4 bits) + Sensor Type (4 bits)
 * - Bytes 13-14: Sensor Reading / Distress Metric (16-bit float/uint)
 * - Bytes 15-21: Compressed Text Payload (7 bytes, packed 6-bit ASCII or raw bytes)
 * - Bytes 22-23: CRC-16-CCITT Checksum for noise and transmission error rejection
 */

export interface LoRaTelemetryPacket {
  packetType: 'BEACON' | 'RESPONDER_LOC' | 'SENSOR_ALERT' | 'COMMS_PING';
  priority: 'ROUTINE' | 'PRIORITY' | 'IMMEDIATE' | 'CRITICAL';
  nodeIdHash: number; // 32-bit uint
  lng: number;        // [-180, 180]
  lat: number;        // [-90, 90]
  batteryPct: number; // 0-100
  triageTag: 'NONE' | 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  sensorValue: number;
  shortMessage: string; // up to 7 chars
}

const PACKET_TYPES = ['BEACON', 'RESPONDER_LOC', 'SENSOR_ALERT', 'COMMS_PING'] as const;
const PRIORITIES = ['ROUTINE', 'PRIORITY', 'IMMEDIATE', 'CRITICAL'] as const;
const TRIAGE_TAGS = ['NONE', 'RED', 'YELLOW', 'GREEN', 'BLACK'] as const;

/**
 * Calculates standard CRC-16-CCITT checksum over a buffer.
 */
export function calculateCRC16(data: Uint8Array, length: number): number {
  let crc = 0xffff;
  for (let i = 0; i < length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}

/**
 * Quantizes a float value to a 24-bit unsigned integer.
 */
function quantizeCoord(val: number, min: number, max: number): number {
  const normalized = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return Math.round(normalized * 0xffffff);
}

/**
 * De-quantizes a 24-bit unsigned integer back to float.
 */
function dequantizeCoord(quantized: number, min: number, max: number): number {
  return parseFloat((min + (quantized / 0xffffff) * (max - min)).toFixed(6));
}

/**
 * Encodes a telemetry object into an ultra-compact 24-byte LoRa packet.
 */
export function encodeLoRaPacket(packet: LoRaTelemetryPacket): Uint8Array {
  const buffer = new Uint8Array(24);
  const view = new DataView(buffer.buffer);

  // Byte 0: Type (4 bits) | Priority (4 bits)
  const typeIdx = Math.max(0, PACKET_TYPES.indexOf(packet.packetType as any));
  const prioIdx = Math.max(0, PRIORITIES.indexOf(packet.priority as any));
  buffer[0] = ((typeIdx & 0x0f) << 4) | (prioIdx & 0x0f);

  // Bytes 1-4: Node ID Hash
  view.setUint32(1, packet.nodeIdHash >>> 0, false); // Big endian

  // Bytes 5-7: 24-bit Quantized Longitude
  const qLng = quantizeCoord(packet.lng, -180, 180);
  buffer[5] = (qLng >> 16) & 0xff;
  buffer[6] = (qLng >> 8) & 0xff;
  buffer[7] = qLng & 0xff;

  // Bytes 8-10: 24-bit Quantized Latitude
  const qLat = quantizeCoord(packet.lat, -90, 90);
  buffer[8] = (qLat >> 16) & 0xff;
  buffer[9] = (qLat >> 8) & 0xff;
  buffer[10] = qLat & 0xff;

  // Byte 11: Battery
  buffer[11] = Math.max(0, Math.min(100, Math.round(packet.batteryPct)));

  // Byte 12: Triage Tag
  const triageIdx = Math.max(0, TRIAGE_TAGS.indexOf(packet.triageTag as any));
  buffer[12] = (triageIdx & 0x0f) << 4;

  // Bytes 13-14: Sensor value (scaled integer, factor 10)
  const scaledSensor = Math.max(0, Math.min(0xffff, Math.round(packet.sensorValue * 10)));
  view.setUint16(13, scaledSensor, false);

  // Bytes 15-21: Short message (7 ASCII chars)
  const msg = packet.shortMessage || '';
  for (let i = 0; i < 7; i++) {
    buffer[15 + i] = i < msg.length ? msg.charCodeAt(i) & 0x7f : 0x00;
  }

  // Bytes 22-23: CRC-16 Checksum
  const crc = calculateCRC16(buffer, 22);
  view.setUint16(22, crc, false);

  return buffer;
}

/**
 * Decodes a 24-byte LoRa packet into a telemetry object.
 * Returns null if the CRC-16 checksum fails or size is invalid.
 */
export function decodeLoRaPacket(buffer: Uint8Array): LoRaTelemetryPacket | null {
  if (buffer.length !== 24) return null;
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Verify CRC-16
  const receivedCRC = view.getUint16(22, false);
  const computedCRC = calculateCRC16(buffer, 22);
  if (receivedCRC !== computedCRC) {
    return null; // Corrupted packet dropped
  }

  // Byte 0
  const typeIdx = (buffer[0] >> 4) & 0x0f;
  const prioIdx = buffer[0] & 0x0f;
  const packetType = PACKET_TYPES[typeIdx] || 'BEACON';
  const priority = PRIORITIES[prioIdx] || 'ROUTINE';

  // Bytes 1-4
  const nodeIdHash = view.getUint32(1, false);

  // Bytes 5-7
  const qLng = (buffer[5] << 16) | (buffer[6] << 8) | buffer[7];
  const lng = dequantizeCoord(qLng, -180, 180);

  // Bytes 8-10
  const qLat = (buffer[8] << 16) | (buffer[9] << 8) | buffer[10];
  const lat = dequantizeCoord(qLat, -90, 90);

  // Byte 11
  const batteryPct = buffer[11];

  // Byte 12
  const triageIdx = (buffer[12] >> 4) & 0x0f;
  const triageTag = TRIAGE_TAGS[triageIdx] || 'NONE';

  // Bytes 13-14
  const sensorValue = parseFloat((view.getUint16(13, false) / 10).toFixed(1));

  // Bytes 15-21
  let shortMessage = '';
  for (let i = 0; i < 7; i++) {
    const code = buffer[15 + i];
    if (code !== 0) shortMessage += String.fromCharCode(code);
  }

  return {
    packetType,
    priority,
    nodeIdHash,
    lng,
    lat,
    batteryPct,
    triageTag,
    sensorValue,
    shortMessage,
  };
}
