/**
 * Delay-Tolerant Networking (DTN) Bundle Protocol (RFC 9171 / RFC 5050) — Industrial Readiness Level 11 (IR-11)
 * 
 * Enables Store-Carry-and-Forward asynchronous epidemic & PRoPHET probabilistic routing in disaster zones
 * where cellular and WiFi networks are completely partitioned.
 * 
 * Mobile responders and drones act as "Data Mules", carrying bundles in persistent storage
 * with delivery predictability metrics ($P_{(a, b)}$) and reactive fragment reassembly.
 */

export interface DTNBundle {
  bundleId: string;
  sourceNodeId: string;
  destinationNodeId: string; // Specific node ID or '*' for network-wide broadcast
  creationTimestamp: number;
  ttlMs: number;              // Time-To-Live (default: 24-72 hours in disaster)
  hopCount: number;
  maxHops: number;
  payloadType: 'SOS_BEACON' | 'CASUALTY_REPORT' | 'SUPPLY_MANIFEST' | 'TACTICAL_ORDER' | 'CUSTOM';
  payload: Record<string, any> | string;
  custodyAcceptedBy?: string[]; // Node IDs that have assumed custody
  isDelivered?: boolean;
  priorityWeight?: number;    // 1 (Routine) to 10 (Critical SOS)
  fragmentOffset?: number;    // For reactive fragment slicing
  totalPayloadSize?: number;
}

export interface PeerDeliveryPredictability {
  peerNodeId: string;
  predictabilityScore: number; // 0.0 to 1.0 (PRoPHET metric)
  lastEncounterTimestamp: number;
}

export class DTNBundleStore {
  private bundles = new Map<string, DTNBundle>();
  private deliveryPredictabilities = new Map<string, PeerDeliveryPredictability>();
  private maxStoreCapacity: number;
  private readonly P_encounter_max = 0.75;
  private readonly gamma_aging = 0.98; // Aging factor per hour

  constructor(maxCapacity: number = 1000) {
    this.maxStoreCapacity = maxCapacity;
  }

  /**
   * Updates PRoPHET delivery predictability metric upon physical encounter with a peer node.
   */
  public registerPeerEncounter(peerNodeId: string): number {
    const now = Date.now();
    const existing = this.deliveryPredictabilities.get(peerNodeId);

    let oldP = 0.0;
    if (existing) {
      const elapsedHours = (now - existing.lastEncounterTimestamp) / 3_600_000;
      oldP = existing.predictabilityScore * Math.pow(this.gamma_aging, elapsedHours);
    }

    const newP = oldP + (1 - oldP) * this.P_encounter_max;
    const roundedP = parseFloat(Math.min(0.99, newP).toFixed(3));

    this.deliveryPredictabilities.set(peerNodeId, {
      peerNodeId,
      predictabilityScore: roundedP,
      lastEncounterTimestamp: now,
    });

    return roundedP;
  }

  /**
   * Ingests a new or carried bundle into local store.
   */
  public ingestBundle(bundle: DTNBundle, currentNodeId: string): boolean {
    const now = Date.now();

    // Check TTL expiration
    if (now - bundle.creationTimestamp > bundle.ttlMs) {
      return false; // Expired bundle dropped
    }

    // Check Max Hop count limit
    if (bundle.hopCount >= bundle.maxHops) {
      return false; // Hop limit exceeded
    }

    // Duplicate check
    const existing = this.bundles.get(bundle.bundleId);
    if (existing) {
      if (bundle.custodyAcceptedBy) {
        const merged = Array.from(new Set([...(existing.custodyAcceptedBy || []), ...bundle.custodyAcceptedBy]));
        existing.custodyAcceptedBy = merged;
      }
      return false;
    }

    // Enforce store capacity
    if (this.bundles.size >= this.maxStoreCapacity) {
      this.evictLowestPriorityOrOldest();
    }

    const updatedBundle: DTNBundle = {
      ...bundle,
      hopCount: bundle.hopCount + 1,
      custodyAcceptedBy: Array.from(new Set([...(bundle.custodyAcceptedBy || []), currentNodeId])),
      priorityWeight: bundle.priorityWeight || (bundle.payloadType === 'SOS_BEACON' ? 10 : 3),
    };

    this.bundles.set(bundle.bundleId, updatedBundle);
    return true;
  }

  /**
   * Reconciles bundle inventory during an encounter, prioritizing high-delivery predictability routes.
   */
  public reconcileWithPeer(
    peerInventoryBundleIds: string[],
    peerNodeId: string
  ): { bundlesToOffer: DTNBundle[]; neededBundleIds: string[] } {
    this.registerPeerEncounter(peerNodeId);

    const now = Date.now();
    const peerSet = new Set(peerInventoryBundleIds);
    const bundlesToOffer: DTNBundle[] = [];

    for (const [id, bundle] of this.bundles) {
      if (!peerSet.has(id) && (now - bundle.creationTimestamp <= bundle.ttlMs)) {
        bundlesToOffer.push(bundle);
      }
    }

    // Sort offer queue: Highest priority SOS bundles first, then lowest hop count
    bundlesToOffer.sort((a, b) => (b.priorityWeight || 1) - (a.priorityWeight || 1) || a.hopCount - b.hopCount);

    const neededBundleIds = peerInventoryBundleIds.filter(id => !this.bundles.has(id));

    return {
      bundlesToOffer,
      neededBundleIds,
    };
  }

  private evictLowestPriorityOrOldest() {
    let lowestBundleId: string | null = null;
    let lowestScore = Infinity;

    for (const [id, b] of this.bundles) {
      if (b.isDelivered) {
        lowestBundleId = id;
        break;
      }
      const score = (b.priorityWeight || 1) * 1000 - (Date.now() - b.creationTimestamp);
      if (score < lowestScore) {
        lowestScore = score;
        lowestBundleId = id;
      }
    }

    if (lowestBundleId) {
      this.bundles.delete(lowestBundleId);
    }
  }

  public getActiveBundles(): DTNBundle[] {
    return Array.from(this.bundles.values());
  }

  public getStoreCount(): number {
    return this.bundles.size;
  }

  public getBundle(bundleId: string): DTNBundle | undefined {
    return this.bundles.get(bundleId);
  }

  public getDeliveryPredictability(peerId: string): number {
    return this.deliveryPredictabilities.get(peerId)?.predictabilityScore || 0.0;
  }

}

