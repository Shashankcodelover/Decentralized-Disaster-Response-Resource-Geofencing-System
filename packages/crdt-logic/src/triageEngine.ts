/**
 * Mass Casualty Incident (MCI) Triage Engine
 * 
 * Implements clinical decision algorithms for disaster triage:
 * 1. START (Simple Triage and Rapid Treatment) — Under-60-second field algorithmic sorting
 * 2. SALT (Sort, Assess, Lifesaving Interventions, Treatment/Transport) — Evidence-based all-hazards triage
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
  respiratoryRatePerMin?: number; // Normal is 10-30 bpm
  hasRadialPulse?: boolean;       // Or capillary refill < 2s
  capillaryRefillSec?: number;
  followsCommands?: boolean;      // Mental status check
  hasSevereHemorrhage?: boolean;
  ageYears?: number;              // Pediatric threshold (<8 years) uses JumpSTART adaptation
}

export interface TriageResult {
  patientId: string;
  color: TriageColor;
  priorityLevel: 0 | 1 | 2 | 3;   // 1 = highest urgent evacuation, 0 = expectant/deceased
  categoryName: string;
  recommendedInterventions: string[];
  rationale: string;
  assignedHospital?: {
    hubId: string;
    name: string;
    distanceKm: number;
  };
}

/**
 * Executes the START (Simple Triage and Rapid Treatment) algorithm.
 */
export function evaluateSTART(patient: PatientAssessment): TriageResult {
  const interventions: string[] = [];

  // Step 1: Ambulatory check (Minor / Green)
  if (patient.isAbleToWalk) {
    return {
      patientId: patient.patientId,
      color: 'GREEN',
      priorityLevel: 3,
      categoryName: 'Minor (Walking Wounded)',
      recommendedInterventions: ['Direct to Secondary Casualty Collection Point', 'Basic first aid bandage'],
      rationale: 'Patient is ambulatory and follows global evacuation commands.',
    };
  }

  // Step 2: Respiration check (Breathing status)
  if (!patient.isBreathing) {
    // Attempt simple airway repositioning
    interventions.push('Open airway / clear obstruction');
    return {
      patientId: patient.patientId,
      color: 'BLACK',
      priorityLevel: 0,
      categoryName: 'Deceased / Expectant',
      recommendedInterventions: interventions,
      rationale: 'Apneic even after simple airway positioning. Resources directed to salvageable victims.',
    };
  }

  // Check respiratory rate (>30 bpm indicates immediate shock/respiratory distress)
  const respRate = patient.respiratoryRatePerMin ?? 20;
  if (respRate > 30 || respRate < 10) {
    interventions.push('High-flow Oxygen / Assisted ventilation');
    return {
      patientId: patient.patientId,
      color: 'RED',
      priorityLevel: 1,
      categoryName: 'Immediate (Life Threatening)',
      recommendedInterventions: interventions,
      rationale: `Abnormal respiratory rate (${respRate} bpm). Imminent respiratory collapse.`,
    };
  }

  // Step 3: Perfusion / Hemorrhage check (Radial pulse / Capillary Refill)
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
      categoryName: 'Immediate (Compromised Perfusion)',
      recommendedInterventions: interventions,
      rationale: 'Absent radial pulse or capillary refill > 2 seconds indicates decompensated shock.',
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
      rationale: 'Unable to follow simple commands. Potential traumatic brain injury or severe hypoperfusion.',
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

  for (const r of results) {
    counts[r.color]++;
  }

  // Triage acuity score (percentage of active survivors needing immediate intervention)
  const activeSurvivors = counts.RED + counts.YELLOW + counts.GREEN;
  const acuityRatio = activeSurvivors > 0 ? (counts.RED / activeSurvivors) : 0;

  return {
    counts,
    criticalImmediateCount: counts.RED,
    delayedCount: counts.YELLOW,
    minorCount: counts.GREEN,
    expectantCount: counts.BLACK,
    acuityPercentage: parseFloat((acuityRatio * 100).toFixed(1)),
    estimatedAmbulanceLoadsNeeded: Math.ceil(counts.RED + (counts.YELLOW * 0.5)),
  };
}
