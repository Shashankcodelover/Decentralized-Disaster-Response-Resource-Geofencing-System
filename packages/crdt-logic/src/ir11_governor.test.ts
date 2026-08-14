import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EmergencyGovernor } from './emergencyGovernor';

describe('IR-11 Feature 7: Enhanced Multi-Sig Emergency Governor & FEMA ICS-204', () => {
  it('executes mandate upon 2-of-3 quorum and generates FEMA ICS-204 assignment list', () => {
    const gov = new EmergencyGovernor([
      { signerId: 'ic-01', agencyName: 'FEMA Incident Command', publicKeyHex: '04aa', role: 'incident_commander' },
      { signerId: 'fire-01', agencyName: 'Metropolitan Fire Dept', publicKeyHex: '04bb', role: 'fire_marshall' },
      { signerId: 'med-01', agencyName: 'Health Operations', publicKeyHex: '04cc', role: 'chief_medical_officer' },
    ]);

    const proposal = gov.createProposal(
      'MANDATORY_EVACUATION',
      'Immediate Evacuation of Flood Zone Charlie',
      'zone-c-flood',
      { hours: 6 },
      2
    );

    // 1st sign: not yet executed
    const sign1 = gov.signProposal(proposal.proposalId, 'ic-01', 'sig1');
    assert.strictEqual(sign1.executed, false);

    // 2nd sign: quorum reached -> executed & ICS-204 generated!
    const sign2 = gov.signProposal(proposal.proposalId, 'fire-01', 'sig2');
    assert.strictEqual(sign2.executed, true);
    assert.ok(sign2.ics204 !== undefined);
    assert.ok(sign2.ics204?.formId.startsWith('ICS-204-'));
    assert.ok(sign2.ics204?.assignedResources.includes('FEMA Incident Command'));
  });

  it('allows authorized safety officer to veto proposal before execution', () => {
    const gov = new EmergencyGovernor([
      { signerId: 'ic-01', agencyName: 'FEMA IC', publicKeyHex: '04aa', role: 'incident_commander' },
      { signerId: 'safety-01', agencyName: 'Safety Officer', publicKeyHex: '04bb', role: 'public_safety_lead' },
    ]);

    const proposal = gov.createProposal('DAM_WATER_RELEASE', 'Emergency Spillway Open', 'dam-01', {}, 2);
    const vetoSuccess = gov.vetoProposal(proposal.proposalId, 'safety-01', 'Downstream bridge not yet cleared of civilians');
    assert.strictEqual(vetoSuccess, true);

    const signAttempt = gov.signProposal(proposal.proposalId, 'ic-01', 'sig1');
    assert.strictEqual(signAttempt.success, false);
    assert.ok(signAttempt.message.includes('vetoed'));
  });
});
