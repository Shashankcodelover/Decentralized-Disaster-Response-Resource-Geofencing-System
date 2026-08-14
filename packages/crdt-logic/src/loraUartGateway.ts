/**
 * Decentralized Disaster Response Platform: Physical LoRa UART Gateway & SLIP Stream Framer
 * 
 * Implements SLIP (Serial Line Internet Protocol - RFC 1055) framing, AT command handshaking,
 * RSSI/SNR signal telemetry parsing, and packet bridging for ESP32/Heltec SX1262 LoRa hardware.
 */

export interface LoRaRadioConfig {
  frequencyMhz: number; // e.g. 868.0 or 915.0
  spreadingFactor: number; // SF7 - SF12
  bandwidthKhz: number; // 125, 250, 500
  codingRate: string; // '4/5' | '4/8'
  txPowerDbm: number; // 2 - 22 dBm
}

export interface UartLoRaFrame {
  rawPayload: Uint8Array;
  rssiDbm: number;
  snrDb: number;
  frequencyMhz: number;
  timestamp: number;
}

// SLIP special byte codes (RFC 1055)
const SLIP_END = 0xC0;
const SLIP_ESC = 0xDB;
const SLIP_ESC_END = 0xDC;
const SLIP_ESC_ESC = 0xDD;

export class LoRaUartGateway {
  private config: LoRaRadioConfig;
  private isRadioConnected: boolean = true;

  constructor(config: Partial<LoRaRadioConfig> = {}) {
    this.config = {
      frequencyMhz: config.frequencyMhz || 915.0,
      spreadingFactor: config.spreadingFactor || 9,
      bandwidthKhz: config.bandwidthKhz || 125,
      codingRate: config.codingRate || '4/5',
      txPowerDbm: config.txPowerDbm || 20,
    };
  }

  /**
   * Encodes a raw binary buffer into a SLIP-framed stream with byte-stuffing.
   */
  encodeSlipFrame(data: Uint8Array): Uint8Array {
    const output: number[] = [SLIP_END];

    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      if (byte === SLIP_END) {
        output.push(SLIP_ESC);
        output.push(SLIP_ESC_END);
      } else if (byte === SLIP_ESC) {
        output.push(SLIP_ESC);
        output.push(SLIP_ESC_ESC);
      } else {
        output.push(byte);
      }
    }

    output.push(SLIP_END);
    return new Uint8Array(output);
  }

  /**
   * Decodes a SLIP-framed byte stream, removing delimiters and un-escaping stuffed bytes.
   */
  decodeSlipFrame(stream: Uint8Array): Uint8Array {
    const output: number[] = [];
    let i = 0;

    // Skip leading SLIP_END bytes
    while (i < stream.length && stream[i] === SLIP_END) {
      i++;
    }

    for (; i < stream.length; i++) {
      const byte = stream[i];
      if (byte === SLIP_END) {
        break; // Reached end of frame
      }

      if (byte === SLIP_ESC) {
        i++;
        if (i >= stream.length) break;
        const nextByte = stream[i];
        if (nextByte === SLIP_ESC_END) {
          output.push(SLIP_END);
        } else if (nextByte === SLIP_ESC_ESC) {
          output.push(SLIP_ESC);
        } else {
          // Protocol error fallback: push raw next byte
          output.push(nextByte);
        }
      } else {
        output.push(byte);
      }
    }

    return new Uint8Array(output);
  }

  /**
   * Generates modem AT configuration sequence for Semtech SX1262 / SX1276 UART controllers.
   */
  generateAtCommandSequence(): string[] {
    return [
      'AT+RESTORE',
      `AT+BAND=${this.config.frequencyMhz}`,
      `AT+SF=${this.config.spreadingFactor}`,
      `AT+BW=${this.config.bandwidthKhz}`,
      `AT+CR=${this.config.codingRate}`,
      `AT+POWER=${this.config.txPowerDbm}`,
      'AT+MODE=TEST_RX_CONTINUOUS'
    ];
  }

  /**
   * Parses radio telemetry line (e.g. "+RCV=24,0,-82,9" -> length, err, rssi, snr).
   */
  parseRadioTelemetry(telemetryString: string): { rssiDbm: number; snrDb: number; isValid: boolean } {
    const match = telemetryString.match(/([+-]?\d+)\s*,\s*([+-]?\d+)\s*$/);
    if (!match) {
      return { rssiDbm: -100, snrDb: 0, isValid: false };
    }

    const rssiDbm = parseInt(match[1], 10);
    const snrDb = parseInt(match[2], 10);

    return {
      rssiDbm: isNaN(rssiDbm) ? -100 : rssiDbm,
      snrDb: isNaN(snrDb) ? 0 : snrDb,
      isValid: true
    };
  }

  /**
   * Evaluates packet link quality based on RSSI and SNR.
   */
  evaluateLinkQuality(rssiDbm: number, snrDb: number): {
    quality: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'CRITICAL';
    packetLossProbability: number;
  } {
    if (rssiDbm > -85 && snrDb > 5) {
      return { quality: 'EXCELLENT', packetLossProbability: 0.01 };
    }
    if (rssiDbm > -105 && snrDb > -3) {
      return { quality: 'GOOD', packetLossProbability: 0.08 };
    }
    if (rssiDbm > -120 && snrDb > -12) {
      return { quality: 'MARGINAL', packetLossProbability: 0.35 };
    }
    return { quality: 'CRITICAL', packetLossProbability: 0.78 };
  }

  getConfig(): LoRaRadioConfig {
    return { ...this.config };
  }
}

export const loraUartGateway = new LoRaUartGateway();
