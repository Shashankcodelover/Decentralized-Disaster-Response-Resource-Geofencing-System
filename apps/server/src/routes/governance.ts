import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { EmergencyGovernor, AgencySigner, MandateType } from '@mirage/crdt-logic';
import { z } from 'zod';
import logger from '../logger';

export const governanceRouter = Router();

// Default recognized disaster agencies
const initialSigners: AgencySigner[] = [
  {
    signerId: 'signer-ic-01',
    agencyName: 'FEMA Unified Command',
    publicKeyHex: '04a1b2c3d4e5f6',
    role: 'incident_commander',
  },
  {
    signerId: 'signer-fire-01',
    agencyName: 'Metropolitan Fire & Rescue',
    publicKeyHex: '04b2c3d4e5f6a1',
    role: 'fire_marshall',
  },
  {
    signerId: 'signer-med-01',
    agencyName: 'State Health Disaster Operations',
    publicKeyHex: '04c3d4e5f6a1b2',
    role: 'chief_medical_officer',
  },
];

const governor = new EmergencyGovernor(initialSigners);

const createProposalSchema = z.object({
  mandateType: z.enum(['MANDATORY_EVACUATION', 'DAM_WATER_RELEASE', 'HAZARD_CONTAINMENT_LOCKDOWN', 'STRATEGIC_SUPPLY_REALLOCATION']),
  title: z.string().min(3),
  targetZoneId: z.string().min(1),
  parameters: z.record(z.string(), z.any()),
  requiredSignatures: z.number().int().min(1).default(2),
  ttlHours: z.number().positive().default(12),
});

const signProposalSchema = z.object({
  signerId: z.string().min(1),
  signatureHex: z.string().min(4),
});

/**
 * POST /api/v1/governance/proposals
 * Creates a new emergency multi-sig governance proposal.
 */
governanceRouter.post('/proposals', requireAuth, validate(createProposalSchema), async (req, res) => {
  try {
    const { mandateType, title, targetZoneId, parameters, requiredSignatures, ttlHours } = req.body;
    const proposal = governor.createProposal(
      mandateType as MandateType,
      title,
      targetZoneId,
      parameters,
      requiredSignatures,
      ttlHours
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('governance:proposal:created', proposal);
    }

    logger.info({ proposalId: proposal.proposalId, mandate: proposal.mandateType }, 'Emergency proposal created');
    res.status(201).json(proposal);
  } catch (err) {
    logger.error({ err }, 'Failed to create governance proposal');
    res.status(500).json({ error: 'Create proposal error' });
  }
});

/**
 * POST /api/v1/governance/proposals/:proposalId/sign
 * Submits an agency cryptographic signature for a proposal.
 */
governanceRouter.post('/proposals/:proposalId/sign', requireAuth, validate(signProposalSchema), async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { signerId, signatureHex } = req.body;

    const result = governor.signProposal(proposalId, signerId, signatureHex);
    if (!result.success) {
      return res.status(400).json(result);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('governance:proposal:signed', { proposalId, result });
      if (result.executed) {
        io.emit('governance:mandate:executed', governor.getProposal(proposalId));
      }
    }

    logger.info({ proposalId, signerId, executed: result.executed }, 'Governance proposal signature recorded');
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to sign governance proposal');
    res.status(500).json({ error: 'Sign proposal error' });
  }
});

/**
 * GET /api/v1/governance/proposals
 * Returns all active and executed emergency governance proposals.
 */
governanceRouter.get('/proposals', requireAuth, async (_req, res) => {
  try {
    const list = governor.getAllProposals();
    res.json({
      count: list.length,
      proposals: list,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch proposals');
    res.status(500).json({ error: 'Fetch proposals error' });
  }
});
