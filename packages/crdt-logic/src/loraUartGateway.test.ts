import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LoRaUartGateway } from './loraUartGateway';

describe('Hardware Gateway: ESP32 SX1262 LoRa UART & SLIP Framer', () => {
  const gateway = new LoRaUartGateway({
    frequencyMhz: 868.0,
    spreadingFactor: 10,
    txPowerDbm: 22
  });

  it('correctly encodes and decodes SLIP frames with byte stuffing', () => {
    // Binary payload with SLIP control bytes embedded
    const rawData = new Uint8Array([0x01, 0xC0, 0x02, 0xDB, 0x03, 0xFF]);
    const encoded = gateway.encodeSlipFrame(rawData);

    // Frame must start and end with SLIP_END (0xC0)
    assert.strictEqual(encoded[0], 0xC0);
    assert.strictEqual(encoded[encoded.length - 1], 0xC0);
    // Length must expand due to 0xC0 and 0xDB byte stuffing
    assert.strictEqual(encoded.length, 10);

    const decoded = gateway.decodeSlipFrame(encoded);
    assert.deepStrictEqual(Array.from(decoded), Array.from(rawData));
  });

  it('generates valid AT command configuration sequence for SX1262 hardware', () => {
    const atCommands = gateway.generateAtCommandSequence();
    assert.ok(atCommands.includes('AT+BAND=868'));
    assert.ok(atCommands.includes('AT+SF=10'));
    assert.ok(atCommands.includes('AT+POWER=22'));
    assert.ok(atCommands.includes('AT+MODE=TEST_RX_CONTINUOUS'));
  });

  it('parses radio telemetry strings and evaluates link quality', () => {
    const telemetry = gateway.parseRadioTelemetry('+RCV=24,0,-88,7');
    assert.strictEqual(telemetry.isValid, true);
    assert.strictEqual(telemetry.rssiDbm, -88);
    assert.strictEqual(telemetry.snrDb, 7);

    const linkEval = gateway.evaluateLinkQuality(-88, 7);
    assert.strictEqual(linkEval.quality, 'GOOD');
    assert.ok(linkEval.packetLossProbability < 0.1);
  });
});
