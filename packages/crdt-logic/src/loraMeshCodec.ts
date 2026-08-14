/**
 * Ultra-Compact LoRa 24-Byte Binary Mesh Codec — Industrial Readiness Level 11 (IR-11)
 * 
 * Compresses disaster response telemetry into 24-byte binary frames
 * optimized for low-bandwidth LoRa radio transceivers (868/915 MHz, 250 bps - 5 kbps)
 * with Adaptive Data Rate (ADR-SF) time-on-air optimization and mesh hop limits.
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
  hopCount?: number;    // 0-7
}

export interface LoRaAirtimeMetrics {
  spreadingFactor: 7 | 8 | 9 | 10 | 11 | 12;
  bandwidthKhz: 125 | 250 | 500;
  codingRate: '4/5' | '4/6' | '4/7' | '4/8';
  timeOnAirMs: number;
  maxDistanceEstimateKm: number;
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

  // Byte 12: Triage Tag (4 bits) | Hop Count (4 bits)
  const triageIdx = Math.max(0, TRIAGE_TAGS.indexOf(packet.triageTag as any));
  const hops = Math.min(15, packet.hopCount || 0);
  buffer[12] = ((triageIdx & 0x0f) << 4) | (hops & 0x0f);

  // Bytes 13-14: Sensor Reading (Fixed 10x scale)
  view.setInt16(13, Math.round(packet.sensorValue * 10), false);

  // Bytes 15-21: Compressed Text Payload (7 bytes ASCII)
  const msgBytes = new TextEncoder().encode((packet.shortMessage || '').padEnd(7, ' '));
  for (let i = 0; i < 7; i++) {
    buffer[15 + i] = msgBytes[i] || 0x20;
  }

  // Bytes 22-23: CRC-16
  const crc = calculateCRC16(buffer, 22);
  view.setUint16(22, crc, false);

  return buffer;
}

/**
 * Decodes a 24-byte LoRa buffer and verifies CRC-16 integrity.
 */
export function decodeLoRaPacket(buffer: Uint8Array): (LoRaTelemetryPacket & { isValid: boolean }) | null {
  if (buffer.length !== 24) return null;

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Verify CRC
  const receivedCrc = view.getUint16(22, false);
  const computedCrc = calculateCRC16(buffer, 22);
  if (receivedCrc !== computedCrc) {
    return null;
  }


  const typeIdx = (buffer[0] >> 4) & 0x0f;
  const prioIdx = buffer[0] & 0x0f;
  const nodeIdHash = view.getUint32(1, false);

  const qLng = (buffer[5] << 16) | (buffer[6] << 8) | buffer[7];
  const qLat = (buffer[8] << 16) | (buffer[9] << 8) | buffer[10];

  const lng = dequantizeCoord(qLng, -180, 180);
  const lat = dequantizeCoord(qLat, -90, 90);
  const batteryPct = buffer[11];

  const triageIdx = (buffer[12] >> 4) & 0x0f;
  const hopCount = buffer[12] & 0x0f;

  const rawSensor = view.getInt16(13, false);
  const sensorValue = parseFloat((rawSensor / 10).toFixed(1));

  const textBytes = buffer.slice(15, 22);
  const shortMessage = new TextDecoder().decode(textBytes).trim();

  return {
    isValid: true,
    packetType: PACKET_TYPES[typeIdx] || 'BEACON',
    priority: PRIORITIES[prioIdx] || 'ROUTINE',
    nodeIdHash,
    lng,
    lat,
    batteryPct,
    triageTag: TRIAGE_TAGS[triageIdx] || 'NONE',
    sensorValue,
    shortMessage,
    hopCount,
  };
}

/**
 * Computes LoRa radio Time-on-Air (ToA) based on Semtech SX1262 physics equation.
 */
export function calculateTimeOnAir(
  payloadBytes: number = 24,
  sf: 7 | 8 | 9 | 10 | 11 | 12 = 9,
  bwKhz: 125 | 250 | 500 = 125,
  cr: '4/5' | '4/6' | '4/7' | '4/8' = '4/5'
): LoRaAirtimeMetrics {
  const crDenom = parseInt(cr.split('/')[1]);
  const crVal = crDenom - 4; // 1 for 4/5, 2 for 4/6, etc.

  const tSymbol = (Math.pow(2, sf) / (bwKhz * 1000)) * 1000; // in ms
  const tPreamble = (8 + 4.25) * tSymbol;

  // Payload symbols formula
  const de = sf >= 11 ? 1 : 0; // Low data rate optimization
  const ih = 0; // Explicit header
  const payloadSymb =
    8 +
    Math.max(
      Math.ceil((8 * payloadBytes - 4 * sf + 28 + 16 - 20 * ih) / (4 * (sf - 2 * de))) * (crVal + 4),
      0
    );

  const tPayload = payloadSymb * tSymbol;
  const totalToa = Math.round(tPreamble + tPayload);

  // Approximate line-of-sight vs urban range
  const rangeMap: Record<number, number> = {
    7: 3.5,
    8: 5.0,
    9: 8.2,
    10: 12.5,
    11: 18.0,
    12: 25.0,
  };

  return {
    spreadingFactor: sf,
    bandwidthKhz: bwKhz,
    codingRate: cr,
    timeOnAirMs: totalToa,
    maxDistanceEstimateKm: rangeMap[sf] || 8.0,
  };
}
