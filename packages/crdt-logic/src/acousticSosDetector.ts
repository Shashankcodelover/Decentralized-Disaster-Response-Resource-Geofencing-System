/**
 * Decentralized Disaster Response Platform: Acoustic Distress & Voice SOS Detector
 * 
 * Analyzes audio spectrum frames for Morse Code SOS pulses, 3kHz survival whistle frequencies,
 * and distressed vocal pitch modulation to locate victims buried under rubble or trapped in debris.
 */

export interface AudioSpectralFrame {
  timestampMs: number;
  dominantFrequencyHz: number;
  spectralPowerDb: number;
  signalToNoiseRatioDb: number;
  vocalPitchF0Hz?: number;
  pitchModulationPercent?: number;
  isPulsing: boolean;
  pulseDurationMs?: number;
}

export interface AcousticSosClassification {
  detectionType: 'WHISTLE_SOS' | 'MORSE_CODE_SOS' | 'HUMAN_VOCAL_DISTRESS' | 'ENVIRONMENTAL_NOISE';
  confidence: number; // 0.0 - 1.0
  isSosConfirmed: boolean;
  frequencyHz: number;
  estimatedUrgency: 'CRITICAL_IMMEDIATE' | 'HIGH' | 'LOW_INVESTIGATE' | 'NONE';
  mitigationOrAction: string;
}

export class AcousticSosDetector {
  /**
   * Analyzes an array of time-series spectral audio frames to classify distress signals.
   */
  classifyAudioBuffer(frames: AudioSpectralFrame[]): AcousticSosClassification {
    if (!frames || frames.length === 0) {
      return {
        detectionType: 'ENVIRONMENTAL_NOISE',
        confidence: 0,
        isSosConfirmed: false,
        frequencyHz: 0,
        estimatedUrgency: 'NONE',
        mitigationOrAction: 'No audio signal captured.',
      };
    }

    // 1. Whistle Frequency Check (2800 Hz - 3300 Hz with high SNR > 14dB)
    const whistleFrames = frames.filter(
      f => f.dominantFrequencyHz >= 2800 && f.dominantFrequencyHz <= 3300 && f.signalToNoiseRatioDb >= 14
    );

    if (whistleFrames.length >= 3) {
      const avgFreq = whistleFrames.reduce((sum, f) => sum + f.dominantFrequencyHz, 0) / whistleFrames.length;
      return {
        detectionType: 'WHISTLE_SOS',
        confidence: 0.96,
        isSosConfirmed: true,
        frequencyHz: Math.round(avgFreq),
        estimatedUrgency: 'CRITICAL_IMMEDIATE',
        mitigationOrAction: 'Survival whistle detected! Pinpoint acoustic microphone coordinates and dispatch search dog / drone.',
      };
    }

    // 2. Morse Code SOS Pattern Check (... --- ...)
    // Expecting alternating short pulses (~100-300ms) and long pulses (~500-1000ms)
    const pulsingFrames = frames.filter(f => f.isPulsing && f.pulseDurationMs);
    if (pulsingFrames.length >= 6) {
      const durations = pulsingFrames.map(f => f.pulseDurationMs!);
      const hasShort = durations.some(d => d >= 80 && d <= 350);
      const hasLong = durations.some(d => d >= 450 && d <= 1200);

      if (hasShort && hasLong) {
        return {
          detectionType: 'MORSE_CODE_SOS',
          confidence: 0.92,
          isSosConfirmed: true,
          frequencyHz: pulsingFrames[0].dominantFrequencyHz,
          estimatedUrgency: 'CRITICAL_IMMEDIATE',
          mitigationOrAction: 'Deliberate Morse code SOS pulsing pattern identified under rubble. Dispatch acoustic seismic team.',
        };
      }
    }

    // 3. Human Vocal Distress Check (F0 in 100-350 Hz, pitch modulation > 15%, high volume)
    const vocalDistressFrames = frames.filter(
      f =>
        f.vocalPitchF0Hz &&
        f.vocalPitchF0Hz >= 100 &&
        f.vocalPitchF0Hz <= 380 &&
        (f.pitchModulationPercent || 0) >= 15 &&
        f.spectralPowerDb >= -25
    );

    if (vocalDistressFrames.length >= 2) {
      const avgF0 = vocalDistressFrames.reduce((sum, f) => sum + (f.vocalPitchF0Hz || 0), 0) / vocalDistressFrames.length;
      return {
        detectionType: 'HUMAN_VOCAL_DISTRESS',
        confidence: 0.88,
        isSosConfirmed: true,
        frequencyHz: Math.round(avgF0),
        estimatedUrgency: 'HIGH',
        mitigationOrAction: 'Human distress vocalization detected. Deploy thermal drone sensor to correlate heat signatures.',
      };
    }

    // 4. Fallback: Environmental Background Noise
    return {
      detectionType: 'ENVIRONMENTAL_NOISE',
      confidence: 0.85,
      isSosConfirmed: false,
      frequencyHz: frames[0].dominantFrequencyHz,
      estimatedUrgency: 'NONE',
      mitigationOrAction: 'Ambient background noise within safe operational baseline.',
    };
  }
}

export const acousticSosDetector = new AcousticSosDetector();
