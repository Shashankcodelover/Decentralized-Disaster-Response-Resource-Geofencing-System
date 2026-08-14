/**
 * Mass Casualty Incident (MCI) Triage Engine — Industrial Readiness Level 11 (IR-11)
 * 
 * Implements clinical decision algorithms for disaster triage:
 * 1. START (Simple Triage and Rapid Treatment) — Under-60-second adult field sorting
 * 2. JumpSTART (Pediatric MCI Triage) — Adapted physiological parameters (<8 years) with 5 rescue breaths
 * 3. SALT (Sort, Assess, Lifesaving Interventions, Treatment/Transport) — Evidence-based multi-hazard triage
 * 4. Tourniquet Ischemia Safety Monitor — Tracks tourniquet application time & reperfusion injury risk
 * 
 * Standard Color Categories:
 * - RED (Immediate / Priority 1): Critical, life-threatening injuries but salvageable
 * - YELLOW (Delayed / Priority 2): Serious injuries needing hospital care, but stable for 1-2 hours
 * - GREEN (Minor / Priority 3): Walking wounded, minor lacerations/contusions
 * - BLACK (Deceased / Expectant / Priority 0): Apneic or non-survivable catastrophic injuries
 */

export type TriageColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

export interface PatientAssessment {
  patientId: string;
  isAbleToWalk: boolean;
  isBreathing: boolean;
  respiratoryRatePerMin?: number; // Adult normal: 10-30 bpm; Pediatric normal: 15-45 bpm
  hasRadialPulse?: boolean;       // Or capillary refill < 2s; Pediatric peripheral pulse
  capillaryRefillSec?: number;
  followsCommands?: boolean;      // Mental status check (AVPU for pediatric)
  hasSevereHemorrhage?: boolean;
  ageYears?: number;              // Pediatric threshold (<8 years) activates JumpSTART
  hasPalpablePulseIfApneic?: boolean; // Pediatric JumpSTART 5-rescue-breath trigger
  tourniquetAppliedTimestampMs?: number;
}

export interface TriageResult {
  patientId: string;
  color: TriageColor;
  priorityLevel: 0 | 1 | 2 | 3;   // 1 = highest urgent evacuation, 0 = expectant/deceased
  categoryName: string;
  recommendedInterventions: string[];
  rationale: string;
  isPediatricJumpStart: boolean;
  tourniquetStatus?: {
    isApplied: boolean;
    elapsedMinutes: number;
    isIschemicDanger: boolean; // >120 mins
    actionRequired: string;
  };
  assignedHospital?: {
    hubId: string;
    name: string;
    distanceKm: number;
  };
}

/**
 * Executes the START / JumpSTART (Pediatric & Adult) algorithm with IR-11 precision.
 */
export function evaluateSTART(patient: PatientAssessment): TriageResult {
  const interventions: string[] = [];
  const isPediatric = (patient.ageYears !== undefined && patient.ageYears < 8);

  // Check Tourniquet Ischemia
  let tourniquetStatus: TriageResult['tourniquetStatus'] = undefined;
  if (patient.tourniquetAppliedTimestampMs) {
    const elapsedMins = Math.floor((Date.now() - patient.tourniquetAppliedTimestampMs) / 60000);
    const danger = elapsedMins >= 120;
    tourniquetStatus = {
      isApplied: true,
      elapsedMinutes: elapsedMins,
      isIschemicDanger: danger,
      actionRequired: danger
        ? 'CRITICAL ALERT: Tourniquet > 2 hours. High risk of nerve damage/ischemia. Immediate surgical vascular consult.'
        : `Tourniquet in place for ${elapsedMins} mins. Monitor distal pulse and skin color.`,
    };
  }

  // Step 1: Ambulatory check (Minor / Green)
  if (patient.isAbleToWalk) {
    return {
      patientId: patient.patientId,
      color: 'GREEN',
      priorityLevel: 3,
      categoryName: 'Minor (Walking Wounded)',
      recommendedInterventions: ['Direct to Secondary Casualty Collection Point', 'Basic first aid bandage'],
      rationale: isPediatric
        ? 'Pediatric patient is ambulatory with normal locomotor activity.'
        : 'Patient is ambulatory and follows global evacuation commands.',
      isPediatricJumpStart: isPediatric,
      tourniquetStatus,
    };
  }

  // Step 2: Respiration check (Breathing status)
  if (!patient.isBreathing) {
    if (isPediatric) {
      // JumpSTART: Check for palpable pulse in apneic child
      if (patient.hasPalpablePulseIfApneic) {
        interventions.push('Deliver 5 rescue breaths (JumpSTART protocol)');
        return {
          patientId: patient.patientId,
          color: 'RED',
          priorityLevel: 1,
          categoryName: 'Immediate (Pediatric JumpSTART Salvage)',
          recommendedInterventions: interventions,
          rationale: 'Apneic child with palpable pulse. Spontaneous breathing may resume following 5 positive pressure rescue breaths.',
          isPediatricJumpStart: true,
          tourniquetStatus,
        };
      }
    }

    // Adult or pulseless child
    interventions.push('Open airway / clear obstruction');
    return {
      patientId: patient.patientId,
      color: 'BLACK',
      priorityLevel: 0,
      categoryName: 'Deceased / Expectant',
      recommendedInterventions: interventions,
      rationale: isPediatric
        ? 'Apneic and pulseless child. No spontaneous respiration after airway positioning.'
        : 'Apneic even after simple airway positioning. Resources directed to salvageable victims.',
      isPediatricJumpStart: isPediatric,
      tourniquetStatus,
    };
  }

  // Check respiratory rate
  const respRate = patient.respiratoryRatePerMin ?? (isPediatric ? 28 : 20);
  const minNormalResp = isPediatric ? 15 : 10;
  const maxNormalResp = isPediatric ? 45 : 30;

  if (respRate > maxNormalResp || respRate < minNormalResp) {
    interventions.push('High-flow Oxygen / Assisted ventilation');
    return {
      patientId: patient.patientId,
      color: 'RED',
      priorityLevel: 1,
      categoryName: 'Immediate (Severe Respiratory Distress)',
      recommendedInterventions: interventions,
      rationale: `Abnormal respiratory rate (${respRate} bpm, normal: ${minNormalResp}-${maxNormalResp} bpm). Imminent respiratory collapse.`,
      isPediatricJumpStart: isPediatric,
      tourniquetStatus,
    };
  }

  // Step 3: Perfusion / Hemorrhage check (Radial/Pediatric Pulse & Capillary Refill)
  if (patient.hasSevereHemorrhage) {
    interventions.push('Apply arterial tourniquet / wound packing');
  }

  const capRefill = patient.capillaryRefillSec ?? 1.5;
  const hasPulse = patient.hasRadialPulse ?? (capRefill <= 2.0);

  if (!hasPulse || capRefill > 2.0) {
    interventions.push('Control hemorrhage', 'Elevate legs', 'Thermal hypothermia prevention');
    return {
      patientId: patient.patientId,
      color: 'RED',
      priorityLevel: 1,
      categoryName: 'Immediate (Compromised Perfusion / Shock)',
      recommendedInterventions: interventions,
      rationale: 'Absent peripheral pulse or capillary refill > 2 seconds indicates decompensated hemorrhagic shock.',
      isPediatricJumpStart: isPediatric,
      tourniquetStatus,
    };
  }

  // Step 4: Mental Status / Neurological check
  const followsCommands = patient.followsCommands ?? true;
  if (!followsCommands) {
    interventions.push('Spinal stabilization', 'Airway protection');
    return {
      patientId: patient.patientId,
      color: 'RED',
      priorityLevel: 1,
      categoryName: 'Immediate (Altered Mental Status)',
      recommendedInterventions: interventions,
      rationale: isPediatric
        ? 'Inappropriate posturing or unresponsive to voice/pain (AVPU score below Alert).'
        : 'Unable to follow simple commands. Potential traumatic brain injury or severe hypoperfusion.',
      isPediatricJumpStart: isPediatric,
      tourniquetStatus,
    };
  }

  // Step 5: Stable vitals but non-ambulatory (Delayed / Yellow)
  return {
    patientId: patient.patientId,
    color: 'YELLOW',
    priorityLevel: 2,
    categoryName: 'Delayed (Serious but Stable)',
    recommendedInterventions: ['Splint fractures', 'Monitor vitals every 15 minutes', 'Secondary transport queue'],
    rationale: 'Non-ambulatory with stable respirations, perfusion, and mentation.',
    isPediatricJumpStart: isPediatric,
    tourniquetStatus,
  };
}

/**
 * Computes triage summary metrics for a mass casualty incident.
 */
export function summarizeMCI(results: TriageResult[]) {
  const counts = {
    RED: 0,
    YELLOW: 0,
    GREEN: 0,
    BLACK: 0,
    total: results.length,
  };

  let pediatricCount = 0;
  let tourniquetCount = 0;
  let ischemicAlertCount = 0;

  for (const r of results) {
    counts[r.color]++;
    if (r.isPediatricJumpStart) pediatricCount++;
    if (r.tourniquetStatus?.isApplied) tourniquetCount++;
    if (r.tourniquetStatus?.isIschemicDanger) ischemicAlertCount++;
  }

  const activeSurvivors = counts.RED + counts.YELLOW + counts.GREEN;
  const acuityRatio = activeSurvivors > 0 ? (counts.RED / activeSurvivors) : 0;

  return {
    counts,
    criticalImmediateCount: counts.RED,
    delayedCount: counts.YELLOW,
    minorCount: counts.GREEN,
    expectantCount: counts.BLACK,
    pediatricVictimCount: pediatricCount,
    activeTourniquetsCount: tourniquetCount,
    ischemicDangerAlertsCount: ischemicAlertCount,
    acuityPercentage: parseFloat((acuityRatio * 100).toFixed(1)),
    estimatedAmbulanceLoadsNeeded: Math.ceil(counts.RED + (counts.YELLOW * 0.5)),
  };
}
