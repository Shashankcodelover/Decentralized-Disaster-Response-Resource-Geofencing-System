/**
 * Incident Timeline Service
 * 
 * Maintains a chronological, immutable audit trail of all significant
 * disaster response events. Each event is cryptographically chained
 * to the previous one using SHA-256 hashes, creating a lightweight
 * blockchain-style tamper-evident log.
 * 
 * Real-world need: After a disaster, regulatory bodies (FEMA, UN OCHA)
 * require a precise, verifiable timeline of all decisions and actions
 * taken during the response. This service provides that.
 */

import crypto from 'crypto';
import logger from '../logger';
import { IncidentEventModel } from '../models/IncidentEvent';

export type IncidentEventType =
  | 'ZONE_CREATED'
  | 'ZONE_DEACTIVATED'
  | 'RESOURCE_TRANSFER'
  | 'RESOURCE_DEPLETED'
  | 'RESPONDER_DEPLOYED'
  | 'RESPONDER_EVACUATED'
  | 'SOS_RECEIVED'
  | 'SOS_RESOLVED'
  | 'COMMS_BROADCAST'
  | 'GEOFENCE_BREACH'
  | 'DRONE_DISPATCHED'
  | 'SENSOR_ALERT'
  | 'SYSTEM_ALERT';

export interface IncidentEvent {
  eventId: string;
  sequenceNumber: number;
  timestamp: string;
  type: IncidentEventType;
  severity: 'info' | 'warning' | 'critical';
  actor: string;           // userId or system component that triggered this
  description: string;
  metadata: Record<string, unknown>;
  prevHash: string;        // hash of the previous event (chain integrity)
  hash: string;            // hash of this event
}

/**
 * Deterministic canonical SHA-256 hash generator for timeline events.
 */
export function computeEventHash(event: {
  eventId: string;
  timestamp: string;
  type: string;
  severity: string;
  actor: string;
  description: string;
  metadata: Record<string, unknown>;
  prevHash: string;
}): string {
  const hashPayload = JSON.stringify({
    eventId: event.eventId,
    timestamp: event.timestamp,
    type: event.type,
    severity: event.severity,
    actor: event.actor,
    description: event.description,
    metadata: event.metadata || {},
    prevHash: event.prevHash,
  });
  return crypto.createHash('sha256').update(hashPayload).digest('hex');
}

class IncidentTimeline {
  /**
   * Records a new event to the timeline with cryptographic chaining.
   */
  async record(
    type: IncidentEventType,
    severity: IncidentEvent['severity'],
    actor: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<IncidentEvent> {
    const lastEvent = await IncidentEventModel.findOne().sort({ timestamp: -1 });
    const prevHash = lastEvent ? lastEvent.hash : '0'.repeat(64); // Genesis block

    const eventId = crypto.randomUUID();
    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();
    
    // Compute the deterministic chain hash
    const hash = computeEventHash({
      eventId,
      timestamp: isoTimestamp,
      type,
      severity,
      actor,
      description,
      metadata,
      prevHash,
    });

    const newEvent = await IncidentEventModel.create({
      eventId,
      eventType: type,
      severity,
      actorId: actor,
      description,
      metadata,
      timestamp,
      previousHash: prevHash,
      hash,
    });

    logger.info({
      eventId,
      type,
      severity,
    }, `[Timeline] ${type}: ${description}`);

    return {
      eventId,
      sequenceNumber: 0,
      timestamp: newEvent.timestamp.toISOString(),
      type,
      severity,
      actor,
      description,
      metadata,
      prevHash,
      hash,
    };
  }

  /**
   * Returns recent events, optionally filtered by type or severity.
   */
  async query(options: {
    limit?: number;
    type?: IncidentEventType;
    severity?: IncidentEvent['severity'];
    since?: string; // ISO timestamp
  } = {}): Promise<any[]> {
    const filter: any = {};
    if (options.type) filter.eventType = options.type;
    if (options.severity) filter.severity = options.severity;
    if (options.since) filter.timestamp = { $gte: new Date(options.since) };

    const limit = options.limit ?? 100;
    return await IncidentEventModel.find(filter).sort({ timestamp: -1 }).limit(limit);
  }

  /**
   * Verifies the cryptographic integrity of the blockchain event log.
   * Checks both previous-hash linkage and strictly recalculates each block's self-hash.
   */
  async verifyChainIntegrity(): Promise<{ valid: boolean; brokenAt?: string; details?: string }> {
    const events = await IncidentEventModel.find().sort({ timestamp: 1 });
    if (events.length === 0) return { valid: true };

    // Verify Genesis block
    if (events[0].previousHash !== '0'.repeat(64)) {
      return {
        valid: false,
        brokenAt: events[0].eventId || events[0].id,
        details: 'Genesis block previousHash invalid',
      };
    }
    
    for (let i = 0; i < events.length; i++) {
      const current = events[i];

      // Verify prevHash linkage for blocks after genesis
      if (i > 0) {
        const previous = events[i - 1];
        if (current.previousHash !== previous.hash) {
          return {
            valid: false,
            brokenAt: current.eventId || current.id,
            details: `Chain broken at event ${current.eventId || current.id}: previousHash does not match previous block hash`,
          };
        }
      }

      // Verify mathematical self-hash integrity
      const expectedSelfHash = computeEventHash({
        eventId: current.eventId || current.id,
        timestamp: current.timestamp.toISOString(),
        type: current.eventType,
        severity: current.severity,
        actor: current.actorId,
        description: current.description,
        metadata: current.metadata || {},
        prevHash: current.previousHash,
      });

      if (current.hash !== expectedSelfHash) {
        return {
          valid: false,
          brokenAt: current.eventId || current.id,
          details: `Tamper detected at event ${current.eventId || current.id}: self-hash mismatch`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Returns summary statistics of the timeline.
   */
  async getSummary() {
    const totalEvents = await IncidentEventModel.countDocuments();
    const criticalCount = await IncidentEventModel.countDocuments({ severity: 'critical' });
    const warningCount = await IncidentEventModel.countDocuments({ severity: 'warning' });
    
    return {
      totalEvents,
      criticalCount,
      warningCount,
      chainIntegrity: await this.verifyChainIntegrity(),
    };
  }
}

// Singleton instance
export const incidentTimeline = new IncidentTimeline();

