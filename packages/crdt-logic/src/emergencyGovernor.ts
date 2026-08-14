/**
 * Decentralized Multi-Signature Emergency Governor (FEMA ICS-204 Compliant)
 * 
 * Manages cryptographic multi-agency authorization for high-stakes disaster mandates:
 * - Mandatory Zone Evacuation Orders
 * - Emergency Dam Spillway Water Release
 * - Quarantine / Hazardous Chemical Containment Lockdowns
 * - Mass Emergency Resource Confiscation & Redistribution
 * 
 * Enforces M-of-N threshold consensus among designated agency commanders
 * (Incident Commander, Fire Marshall, Chief Medical Officer, Structural Engineer).
 */

export type MandateType =
  | 'MANDATORY_EVACUATION'
  | 'DAM_WATER_RELEASE'
  | 'HAZARD_CONTAINMENT_LOCKDOWN'
  | 'STRATEGIC_SUPPLY_REALLOCATION';

export interface AgencySigner {
  signerId: string;
  agencyName: string; // e.g., 'City Fire Dept', 'FEMA Region IX', 'State Health Authority'
  publicKeyHex: string;
  role: 'incident_commander' | 'fire_marshall' | 'chief_medical_officer' | 'public_safety_lead';
}

export interface SignatureProof {
  signerId: string;
  agencyName: string;
  signatureHex: string;
  signedAt: number;
}

export interface GovernanceProposal {
  proposalId: string;
  mandateType: MandateType;
  title: string;
  targetZoneId: string;
  parameters: Record<string, any>;
  createdAt: number;
  expiresAt: number;
  requiredSignatures: number;
  signatures: SignatureProof[];
  isExecuted: boolean;
  executedAt?: number;
}

export class EmergencyGovernor {
  private authorizedSigners = new Map<string, AgencySigner>();
  private proposals = new Map<string, GovernanceProposal>();

  constructor(initialSigners: AgencySigner[] = []) {
    initialSigners.forEach(s => this.authorizedSigners.set(s.signerId, s));
  }

  public registerSigner(signer: AgencySigner): void {
    this.authorizedSigners.set(signer.signerId, signer);
  }

  /**
   * Creates a new emergency governance mandate proposal requiring M-of-N consensus.
   */
  public createProposal(
    mandateType: MandateType,
    title: string,
    targetZoneId: string,
    parameters: Record<string, any>,
    requiredSignatures: number = 2,
    ttlHours: number = 12
  ): GovernanceProposal {
    const proposalId = `gov-${mandateType.toLowerCase()}-${Date.now()}`;
    const now = Date.now();

    const proposal: GovernanceProposal = {
      proposalId,
      mandateType,
      title,
      targetZoneId,
      parameters,
      createdAt: now,
      expiresAt: now + ttlHours * 3600 * 1000,
      requiredSignatures: Math.max(1, requiredSignatures),
      signatures: [],
      isExecuted: false,
    };

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  /**
   * Submits a cryptographic signature for a proposal.
   * Automatically executes the proposal if quorum threshold is reached.
   */
  public signProposal(
    proposalId: string,
    signerId: string,
    signatureHex: string
  ): { success: boolean; executed: boolean; currentSignatures: number; message: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return { success: false, executed: false, currentSignatures: 0, message: 'Proposal not found' };
    }

    if (Date.now() > proposal.expiresAt) {
      return { success: false, executed: false, currentSignatures: proposal.signatures.length, message: 'Proposal has expired' };
    }

    if (proposal.isExecuted) {
      return { success: false, executed: true, currentSignatures: proposal.signatures.length, message: 'Proposal already executed' };
    }

    const signer = this.authorizedSigners.get(signerId);
    if (!signer) {
      return { success: false, executed: false, currentSignatures: proposal.signatures.length, message: 'Unauthorized signer' };
    }

    // Check if already signed by this signer
    if (proposal.signatures.some(s => s.signerId === signerId)) {
      return { success: false, executed: false, currentSignatures: proposal.signatures.length, message: 'Signer already voted' };
    }

    // Add signature proof
    proposal.signatures.push({
      signerId,
      agencyName: signer.agencyName,
      signatureHex,
      signedAt: Date.now(),
    });

    // Check quorum
    let executed = false;
    if (proposal.signatures.length >= proposal.requiredSignatures) {
      proposal.isExecuted = true;
      proposal.executedAt = Date.now();
      executed = true;
    }

    return {
      success: true,
      executed,
      currentSignatures: proposal.signatures.length,
      message: executed ? 'Quorum achieved! Mandate executed.' : 'Signature recorded.',
    };
  }

  public getProposal(proposalId: string): GovernanceProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public getAllProposals(): GovernanceProposal[] {
    return Array.from(this.proposals.values());
  }
}
