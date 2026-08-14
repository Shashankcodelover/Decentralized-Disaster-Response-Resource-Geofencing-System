import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AcousticSosDetector, AudioSpectralFrame } from './acousticSosDetector';

describe('Search & Rescue: Acoustic Distress Frequency & Voice SOS Detector', () => {
  const detector = new AcousticSosDetector();

  it('detects 3kHz survival whistle distress signals with high confidence', () => {
    const whistleFrames: AudioSpectralFrame[] = [
      { timestampMs: 100, dominantFrequencyHz: 3050, spectralPowerDb: -10, signalToNoiseRatioDb: 18, isPulsing: true },
      { timestampMs: 200, dominantFrequencyHz: 3020, spectralPowerDb: -12, signalToNoiseRatioDb: 19, isPulsing: true },
      { timestampMs: 300, dominantFrequencyHz: 3080, spectralPowerDb: -11, signalToNoiseRatioDb: 22, isPulsing: true },
    ];

    const result = detector.classifyAudioBuffer(whistleFrames);
    assert.strictEqual(result.detectionType, 'WHISTLE_SOS');
    assert.strictEqual(result.isSosConfirmed, true);
    assert.strictEqual(result.estimatedUrgency, 'CRITICAL_IMMEDIATE');
  });

  it('detects Morse Code SOS pulsing patterns (... --- ...)', () => {
    const morseFrames: AudioSpectralFrame[] = [
      { timestampMs: 100, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 10, isPulsing: true, pulseDurationMs: 150 },
      { timestampMs: 300, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 10, isPulsing: true, pulseDurationMs: 150 },
      { timestampMs: 500, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 10, isPulsing: true, pulseDurationMs: 150 },
      { timestampMs: 750, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 10, isPulsing: true, pulseDurationMs: 650 },
      { timestampMs: 1500, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 10, isPulsing: true, pulseDurationMs: 700 },
      { timestampMs: 2300, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 10, isPulsing: true, pulseDurationMs: 150 },
    ];

    const result = detector.classifyAudioBuffer(morseFrames);
    assert.strictEqual(result.detectionType, 'MORSE_CODE_SOS');
    assert.strictEqual(result.isSosConfirmed, true);
    assert.strictEqual(result.estimatedUrgency, 'CRITICAL_IMMEDIATE');
  });

  it('filters out constant ambient machinery/traffic noise', () => {
    const ambientNoise: AudioSpectralFrame[] = [
      { timestampMs: 100, dominantFrequencyHz: 120, spectralPowerDb: -40, signalToNoiseRatioDb: 2, isPulsing: false },
      { timestampMs: 200, dominantFrequencyHz: 120, spectralPowerDb: -41, signalToNoiseRatioDb: 1, isPulsing: false },
    ];

    const result = detector.classifyAudioBuffer(ambientNoise);
    assert.strictEqual(result.detectionType, 'ENVIRONMENTAL_NOISE');
    assert.strictEqual(result.isSosConfirmed, false);
    assert.strictEqual(result.estimatedUrgency, 'NONE');
  });
});
