import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateSTART, summarizeMCI, PatientAssessment } from './triageEngine';

describe('IR-11 Feature 1: Enhanced MCI START & JumpSTART Pediatric Triage', () => {
  it('correctly executes JumpSTART pediatric salvage for apneic child with palpable pulse', () => {
    const child: PatientAssessment = {
      patientId: 'PED-101',
      isAbleToWalk: false,
      isBreathing: false,
      ageYears: 4,
      hasPalpablePulseIfApneic: true,
    };

    const result = evaluateSTART(child);
    assert.strictEqual(result.color, 'RED');
    assert.strictEqual(result.priorityLevel, 1);
    assert.strictEqual(result.isPediatricJumpStart, true);
    assert.ok(result.recommendedInterventions.some(i => i.includes('5 rescue breaths')));
  });

  it('marks pulseless apneic child as expectant (BLACK)', () => {
    const child: PatientAssessment = {
      patientId: 'PED-102',
      isAbleToWalk: false,
      isBreathing: false,
      ageYears: 5,
      hasPalpablePulseIfApneic: false,
    };

    const result = evaluateSTART(child);
    assert.strictEqual(result.color, 'BLACK');
    assert.strictEqual(result.priorityLevel, 0);
  });

  it('applies pediatric-specific respiratory normal ranges (15-45 bpm)', () => {
    // 38 bpm is RED in adult (>30), but normal in a toddler (<45)
    const child: PatientAssessment = {
      patientId: 'PED-103',
      isAbleToWalk: false,
      isBreathing: true,
      respiratoryRatePerMin: 38,
      ageYears: 3,
      hasRadialPulse: true,
      followsCommands: true,
    };

    const result = evaluateSTART(child);
    assert.strictEqual(result.color, 'YELLOW'); // Stable non-ambulatory child
    assert.strictEqual(result.isPediatricJumpStart, true);
  });

  it('tracks tourniquet ischemia duration and alerts after 2 hours', () => {
    const twoHoursAgo = Date.now() - (130 * 60 * 1000); // 130 minutes
    const patient: PatientAssessment = {
      patientId: 'ADULT-99',
      isAbleToWalk: false,
      isBreathing: true,
      respiratoryRatePerMin: 22,
      hasRadialPulse: true,
      followsCommands: true,
      hasSevereHemorrhage: true,
      tourniquetAppliedTimestampMs: twoHoursAgo,
    };

    const result = evaluateSTART(patient);
    assert.ok(result.tourniquetStatus?.isApplied);
    assert.strictEqual(result.tourniquetStatus?.isIschemicDanger, true);
    assert.ok(result.tourniquetStatus?.actionRequired.includes('CRITICAL ALERT'));
  });

  it('summarizeMCI aggregates pediatric and tourniquet metrics accurately', () => {
    const r1 = evaluateSTART({ patientId: 'P1', isAbleToWalk: true, ageYears: 4 });
    const r2 = evaluateSTART({ patientId: 'P2', isAbleToWalk: false, isBreathing: true, respiratoryRatePerMin: 35 });
    const summary = summarizeMCI([r1, r2]);

    assert.strictEqual(summary.counts.total, 2);
    assert.strictEqual(summary.pediatricVictimCount, 1);
  });
});
