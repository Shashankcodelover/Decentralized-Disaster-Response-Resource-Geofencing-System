/**
 * Decentralized Disaster Response Platform: Biometric Triage Wearable Vitals & Shock Index Engine
 * 
 * Computes continuous physiological early warning scores (NEWS2), Shock Index (HR / SBP),
 * cardiac arrest telemetry flags, and automated dynamic MCI triage tag reclassification.
 */

export interface WearableVitalTelemetry {
  patientId: string;
  heartRateBpm: number;
  systolicBpMmhg: number;
  diastolicBpMmhg: number;
  spO2Percent: number;
  respiratoryRateBpm: number;
  bodyTemperatureCelsius: number;
  ecgArrhythmiaDetected: boolean;
  currentTriageTag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  timestamp: number;
}

export interface BiometricEvaluationReport {
  patientId: string;
  shockIndex: number; // HR / SBP (Normal 0.5-0.7; Shock > 1.0)
  news2Score: number; // 0-20 Aggregate National Early Warning Score
  recommendedTriageTag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
  isTagEscalated: boolean;
  criticalAlertFlags: string[];
  immediateIntervention: string;
}

export class BiometricVitalsEngine {
  /**
   * Computes clinical NEWS2 early warning score and evaluates Shock Index.
   */
  evaluateVitals(vitals: WearableVitalTelemetry): BiometricEvaluationReport {
    const shockIndex = parseFloat((vitals.heartRateBpm / Math.max(40, vitals.systolicBpMmhg)).toFixed(2));
    const alerts: string[] = [];
    let news2 = 0;

    // 1. Respiration Rate Score
    if (vitals.respiratoryRateBpm <= 8 || vitals.respiratoryRateBpm >= 25) {
      news2 += 3;
      alerts.push('Severe Tachypnea/Bradypnea');
    } else if (vitals.respiratoryRateBpm >= 21) {
      news2 += 2;
    } else if (vitals.respiratoryRateBpm <= 11) {
      news2 += 1;
    }

    // 2. Oxygen Saturation (SpO2)
    if (vitals.spO2Percent <= 91) {
      news2 += 3;
      alerts.push('Critical Hypoxia (SpO2 <= 91%)');
    } else if (vitals.spO2Percent <= 93) {
      news2 += 2;
    } else if (vitals.spO2Percent <= 95) {
      news2 += 1;
    }

    // 3. Systolic Blood Pressure
    if (vitals.systolicBpMmhg <= 90) {
      news2 += 3;
      alerts.push('Hypotension / Circulatory Collapse (SBP <= 90 mmHg)');
    } else if (vitals.systolicBpMmhg <= 100) {
      news2 += 2;
    } else if (vitals.systolicBpMmhg <= 110) {
      news2 += 1;
    }

    // 4. Heart Rate
    if (vitals.heartRateBpm >= 131 || vitals.heartRateBpm <= 40) {
      news2 += 3;
      alerts.push('Severe Cardiac Arrhythmia / Extreme Tachycardia');
    } else if (vitals.heartRateBpm >= 111 || vitals.heartRateBpm <= 50) {
      news2 += 2;
    } else if (vitals.heartRateBpm >= 91) {
      news2 += 1;
    }

    // 5. Arrhythmia Flag
    if (vitals.ecgArrhythmiaDetected) {
      news2 += 2;
      alerts.push('Active Ventricular Arrhythmia Detected via ECG');
    }

    // Determine Triage Tag based on objective clinical thresholds
    let recommendedTag: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK' = 'GREEN';
    let intervention = 'Routine monitoring in field recovery tent.';

    if (news2 >= 7 || shockIndex >= 1.0 || vitals.spO2Percent <= 90) {
      recommendedTag = 'RED';
      intervention = 'IMMEDIATE MEDEVAC: Administer high-flow O2, bilateral large-bore IV, and prepare tranexamic acid (TXA).';
    } else if (news2 >= 4 || shockIndex >= 0.8) {
      recommendedTag = 'YELLOW';
      intervention = 'URGENT: Re-evaluate vitals every 15 minutes and stage for secondary transport.';
    }

    const isEscalated = vitals.currentTriageTag !== recommendedTag && recommendedTag === 'RED';

    return {
      patientId: vitals.patientId,
      shockIndex,
      news2Score: news2,
      recommendedTriageTag: recommendedTag,
      isTagEscalated: isEscalated,
      criticalAlertFlags: alerts,
      immediateIntervention: intervention,
    };
  }
}

export const biometricVitalsEngine = new BiometricVitalsEngine();
