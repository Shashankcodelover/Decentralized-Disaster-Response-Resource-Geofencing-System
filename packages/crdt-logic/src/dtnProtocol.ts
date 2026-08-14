/**
 * Delay-Tolerant Networking (DTN) Bundle Protocol (RFC 9171 / RFC 5050)
 * 
 * Enables Store-Carry-and-Forward asynchronous epidemic gossip routing in disaster zones
 * where cellular and WiFi networks are completely partitioned.
 * 
 * Mobile responders and drones act as "Data Mules", carrying bundles in persistent storage
 * and replicating them opportunistically upon peer encounter until destination delivery.
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
}

export interface EncounterSyncSummary {
  bundlesReceived: number;
  bundlesSent: number;
  totalStoreCount: number;
}

export class DTNBundleStore {
  private bundles = new Map<string, DTNBundle>();
  private maxStoreCapacity: number;

  constructor(maxCapacity: number = 1000) {
    this.maxStoreCapacity = maxCapacity;
  }

  /**
   * Ingests a new or carried bundle into local store.
   * Rejects expired bundles, loop hops, or duplicates.
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
      // Merge custody if present
      if (bundle.custodyAcceptedBy) {
        const merged = Array.from(new Set([...(existing.custodyAcceptedBy || []), ...bundle.custodyAcceptedBy]));
        existing.custodyAcceptedBy = merged;
      }
      return false;
    }

    // Enforce store capacity via LRU / TTL eviction if full
    if (this.bundles.size >= this.maxStoreCapacity) {
      this.evictOldestOrDelivered();
    }

    // Increment hop count and assume custody
    const updatedBundle: DTNBundle = {
      ...bundle,
      hopCount: bundle.hopCount + 1,
      custodyAcceptedBy: Array.from(new Set([...(bundle.custodyAcceptedBy || []), currentNodeId])),
    };

    this.bundles.set(bundle.bundleId, updatedBundle);
    return true;
  }

  /**
   * Reconciles bundle inventory during an opportunistic encounter with another peer.
   * Exchanges summary vectors (anti-entropy) and transfers missing bundles.
   */
  public reconcileWithPeer(
    peerInventoryBundleIds: string[],
    peerNodeId: string
  ): { bundlesToOffer: DTNBundle[]; neededBundleIds: string[] } {
    const now = Date.now();
    const peerSet = new Set(peerInventoryBundleIds);
    const localIds = new Set(this.bundles.keys());

    // Bundles we have that peer needs (excluding expired)
    const bundlesToOffer: DTNBundle[] = [];
    for (const [id, bundle] of this.bundles) {
      if (!peerSet.has(id) && (now - bundle.creationTimestamp <= bundle.ttlMs)) {
        bundlesToOffer.push(bundle);
      }
    }

    // Bundles peer has that we don't have
    const neededBundleIds: string[] = [];
    for (const pId of peerInventoryBundleIds) {
      if (!localIds.has(pId)) {
        neededBundleIds.push(pId);
      }
    }

    return { bundlesToOffer, neededBundleIds };
  }

  /**
   * Marks a bundle as delivered upon reaching destination or gateway.
   */
  public markDelivered(bundleId: string): boolean {
    const bundle = this.bundles.get(bundleId);
    if (bundle) {
      bundle.isDelivered = true;
      return true;
    }
    return false;
  }

  /**
   * Returns all active non-expired bundles.
   */
  public getActiveBundles(): DTNBundle[] {
    const now = Date.now();
    const active: DTNBundle[] = [];
    for (const [id, bundle] of this.bundles) {
      if (now - bundle.creationTimestamp <= bundle.ttlMs) {
        active.push(bundle);
      } else {
        this.bundles.delete(id); // Lazy cleanup
      }
    }
    return active;
  }

  public getBundleIds(): string[] {
    return Array.from(this.bundles.keys());
  }

  public getBundle(bundleId: string): DTNBundle | undefined {
    return this.bundles.get(bundleId);
  }

  public getStoreCount(): number {
    return this.bundles.size;
  }

  private evictOldestOrDelivered(): void {
    // Evict delivered first
    for (const [id, b] of this.bundles) {
      if (b.isDelivered) {
        this.bundles.delete(id);
        return;
      }
    }

    // Otherwise evict oldest creation timestamp
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    for (const [id, b] of this.bundles) {
      if (b.creationTimestamp < oldestTime) {
        oldestTime = b.creationTimestamp;
        oldestId = id;
      }
    }
    if (oldestId) this.bundles.delete(oldestId);
  }
}
