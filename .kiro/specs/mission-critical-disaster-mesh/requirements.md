# Requirements Document — Mission-Critical Disaster Mesh

## Introduction

This feature extends Project Mirage into a full zero-trust, offline-capable distributed data sync engine. The system must maintain a globally consistent operational picture across all nodes — field tablets, coordination laptops, and cloud servers — even when the central MongoDB/Node.js backend is completely unreachable. This is not a UI enhancement; it is a Distributed Data Sync Engine built on CRDTs, a gossip-style delta-sync protocol over WebRTC, dynamic geofencing with expanding polygons, and a hardened Node.js 22 execution sandbox.

The feature builds directly on the existing `packages/crdt-logic` (Yjs), `apps/server` (Socket.io + Redis), and `apps/web` (React 19 + Leaflet) infrastructure already present in the monorepo.

---

## Glossary

- **Mesh_Node**: Any browser client or server instance participating in the P2P sync network.
- **Delta_Sync_Engine**: The subsystem in `packages/crdt-logic` responsible for computing and exchanging only the missing CRDT fragments between two peers.
- **CRDT_Document**: A Yjs `Y.Doc` instance encoding the shared operational state (resource hubs, danger zones, responder positions).
- **State_Vector**: A Yjs `Y.encodeStateVector` snapshot used to compute the minimal update delta needed to bring a peer up to date.
- **Delta_Update**: The minimal Uint8Array produced by `Y.encodeStateAsUpdate(doc, remoteStateVector)` — contains only operations the remote peer is missing.
- **Gossip_Protocol**: The peer-to-peer update propagation strategy where each Mesh_Node forwards received updates to all its open DataChannels.
- **Expanding_Polygon**: A GeoJSON Polygon whose coordinate ring is programmatically grown outward at a configurable rate (meters per minute) to model fire or flood spread.
- **Dynamic_Geofence**: A danger zone whose geometry changes over time via Expanding_Polygon growth, as opposed to a static polygon.
- **Geofence_Service**: The server-side service in `apps/server/src/services/geofenceService.ts` that performs `$geoIntersects` queries and tracks enter/exit transitions.
- **Spatial_Engine**: The new `services/spatial-engine` package responsible for Expanding_Polygon computation and complex spatial queries.
- **Gateway**: The new `services/gateway` API mesh entry point that routes requests to downstream services.
- **Protocol_Package**: The new `packages/protocol` package containing the CRDT delta-sync logic and gossip protocol implementation.
- **IndexedDB_Store**: The browser-side persistent store (via Dexie.js) that survives page refresh and full internet blackout.
- **Permission_Model**: The Node.js 22 `--experimental-permission` flag set that sandboxes the server process to declared filesystem paths and network endpoints only.
- **Vector_Clock**: A causality-tracking data structure assigned to each resource update to enable deterministic conflict resolution without last-writer-wins semantics.
- **Optimistic_Update**: A React 19 `useOptimistic` state mutation applied immediately in the UI before server confirmation, rolled back on failure.
- **Transition**: A React 19 `startTransition` wrapper that marks a state update as non-urgent, preventing the map UI from blocking on sync operations.
- **ADR**: Architecture Decision Record — a document in `docs/` capturing a significant technical choice and its rationale.

---

## Requirements

### Requirement 1: Delta-Sync Protocol

**User Story:** As a field coordinator, I want two peers that reconnect after a network partition to exchange only the data they are each missing, so that sync completes quickly even on low-bandwidth radio links.

#### Acceptance Criteria

1. THE Delta_Sync_Engine SHALL expose a `computeDelta(localDoc: Y.Doc, remoteStateVector: Uint8Array): Uint8Array` function that returns only the operations the remote peer is missing.
2. WHEN two Mesh_Nodes establish a WebRTC DataChannel, THE Delta_Sync_Engine SHALL exchange State_Vectors before sending any update payload.
3. WHEN a State_Vector is received from a peer, THE Delta_Sync_Engine SHALL compute a Delta_Update using `Y.encodeStateAsUpdate(doc, remoteStateVector)` and send only that delta.
4. WHEN a Delta_Update is received, THE Delta_Sync_Engine SHALL apply it with `Y.applyUpdate` and SHALL NOT re-broadcast the update back to the originating peer.
5. THE Delta_Sync_Engine SHALL be implemented in `packages/protocol` and exported as a reusable module consumable by both `apps/web` and `apps/server`.
6. FOR ALL pairs of CRDT_Documents that have diverged, applying the computed Delta_Update to each SHALL produce identical document states (convergence property).
7. FOR ALL valid CRDT_Documents, encoding then decoding a State_Vector SHALL produce an equivalent State_Vector (round-trip property).

---

### Requirement 2: Gossip Protocol Propagation

**User Story:** As a field agent, I want updates I make offline to propagate to all reachable peers automatically, so that the operational picture stays current across the mesh without manual intervention.

#### Acceptance Criteria

1. WHEN a Mesh_Node receives a Delta_Update from any peer, THE Gossip_Protocol SHALL forward that update to all other open DataChannels except the one it arrived on.
2. THE Gossip_Protocol SHALL tag each update with the originating `peerId` and a monotonically increasing `clock` value to prevent re-forwarding loops.
3. WHEN a Mesh_Node receives an update with a `(peerId, clock)` pair it has already processed, THE Gossip_Protocol SHALL discard the duplicate without applying or forwarding it.
4. WHILE a Mesh_Node has zero open DataChannels and the central server is unreachable, THE Gossip_Protocol SHALL queue outbound updates in the IndexedDB_Store for later delivery.
5. WHEN a new DataChannel opens, THE Gossip_Protocol SHALL drain the IndexedDB_Store queue and deliver all queued updates to the new peer after delta-sync completes.
6. THE Gossip_Protocol SHALL be implemented in `packages/protocol` alongside the Delta_Sync_Engine.

---

### Requirement 3: Expanding Polygon Dynamic Geofencing

**User Story:** As an incident commander, I want danger zones to automatically expand their boundaries over time to model fire or flood spread, so that responders receive accurate geofence alerts as the hazard grows.

#### Acceptance Criteria

1. THE Spatial_Engine SHALL accept an `ExpandingPolygonConfig` containing: `initialGeometry: GeoPolygon`, `expansionRateMetersPerMinute: number`, `startedAt: string` (ISO 8601), and `maxRadiusMeters: number`.
2. WHEN the Spatial_Engine computes the current geometry of an Expanding_Polygon, THE Spatial_Engine SHALL return a GeoPolygon whose boundary has been grown outward by `expansionRateMetersPerMinute × elapsedMinutes` meters from the centroid, capped at `maxRadiusMeters`.
3. THE Spatial_Engine SHALL expose a `computeCurrentGeometry(config: ExpandingPolygonConfig, asOf: Date): GeoPolygon` function.
4. WHEN a DangerZone has an `expansionConfig` field set, THE Geofence_Service SHALL use `computeCurrentGeometry` to obtain the live polygon before executing the `$geoIntersects` query.
5. THE Spatial_Engine SHALL use MongoDB `$geoIntersects` with `$geometry` for all point-in-polygon and polygon-intersection queries.
6. WHEN a DangerZone's expanded geometry intersects another active DangerZone's geometry, THE Spatial_Engine SHALL emit a `zone:overlap` event containing both zone IDs and the intersection polygon.
7. IF `expansionRateMetersPerMinute` is zero or negative, THEN THE Spatial_Engine SHALL treat the zone as a static polygon and SHALL NOT apply any expansion.
8. FOR ALL valid `ExpandingPolygonConfig` inputs, `computeCurrentGeometry(config, t2)` SHALL produce a polygon whose area is greater than or equal to `computeCurrentGeometry(config, t1)` when `t2 > t1` (monotonic growth property).

---

### Requirement 4: Conflict Resolution via Vector Clocks

**User Story:** As a system operator, I want every resource update to carry causal metadata so that conflicting concurrent edits are resolved deterministically without silently discarding any write.

#### Acceptance Criteria

1. THE Protocol_Package SHALL assign a `VectorClock` — a map of `{ [peerId: string]: number }` — to every resource update operation.
2. WHEN two concurrent updates to the same resource field are merged, THE Protocol_Package SHALL apply the update with the causally later Vector_Clock.
3. WHEN two updates have incomparable Vector_Clocks (true concurrency), THE Protocol_Package SHALL resolve the conflict by selecting the update with the lexicographically greater `peerId` to ensure determinism.
4. THE Protocol_Package SHALL expose a `compareVectorClocks(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent'` function.
5. FOR ALL pairs of Vector_Clocks `(a, b)`, `compareVectorClocks(a, b)` SHALL return the inverse of `compareVectorClocks(b, a)` unless both are concurrent (symmetry property).
6. THE Protocol_Package SHALL NOT use last-writer-wins based solely on wall-clock timestamps.

---

### Requirement 5: IndexedDB Offline Persistence

**User Story:** As a field agent, I want the operational state to survive a browser refresh during a total internet blackout, so that I do not lose situational awareness when my tab reloads.

#### Acceptance Criteria

1. THE IndexedDB_Store SHALL persist the full Yjs CRDT_Document state using `Y.encodeStateAsUpdate` on every document update.
2. WHEN the application initialises, THE IndexedDB_Store SHALL restore the CRDT_Document by loading and applying the persisted update before rendering the map.
3. THE IndexedDB_Store SHALL be implemented using Dexie.js and SHALL store updates in a table named `crdt_snapshots` keyed by `docId`.
4. WHEN the IndexedDB_Store write fails, THE Dashboard SHALL display a non-blocking warning indicator without interrupting the user's workflow.
5. THE IndexedDB_Store SHALL also persist the outbound gossip queue so that queued updates survive a page refresh.
6. FOR ALL CRDT_Documents, persisting then restoring the document SHALL produce a document state equivalent to the original (round-trip property).

---

### Requirement 6: React 19 Optimistic Map UI

**User Story:** As a dashboard operator, I want map updates to appear instantly when I make a change, so that the UI feels responsive even when the sync round-trip takes hundreds of milliseconds.

#### Acceptance Criteria

1. THE Dashboard SHALL use React 19 `useOptimistic` to apply resource quantity updates to local UI state immediately upon user action, before server or CRDT confirmation.
2. WHEN a server or CRDT confirmation arrives, THE Dashboard SHALL reconcile the optimistic state with the confirmed state and SHALL discard the optimistic value.
3. IF a server update fails, THEN THE Dashboard SHALL roll back the optimistic state and display an inline error message within the affected ResourcePanel row.
4. THE Dashboard SHALL wrap all CRDT sync state updates in `startTransition` so that map rendering is never blocked by background sync operations.
5. WHILE a Transition is pending, THE Dashboard SHALL display a non-blocking sync indicator in the P2PStatus component without freezing user interaction.
6. THE Dashboard SHALL achieve 0ms perceived latency for user-initiated resource edits by applying Optimistic_Updates before any network round-trip.

---

### Requirement 7: Hybrid Networking — Primary and Fallback Paths

**User Story:** As a system architect, I want the system to seamlessly switch between server-mediated WebSocket sync and direct WebRTC P2P sync, so that coordination continues uninterrupted regardless of cloud availability.

#### Acceptance Criteria

1. WHILE the central server is reachable, THE Mesh_Node SHALL use Socket.io WebSocket as the primary sync transport and Redis Pub/Sub for cross-instance broadcast.
2. WHEN the Socket.io connection is lost, THE Mesh_Node SHALL automatically switch to WebRTC DataChannel transport within 3 seconds without requiring user action.
3. WHEN the Socket.io connection is restored, THE Mesh_Node SHALL flush all pending CRDT updates accumulated during the offline period to the server relay.
4. THE Gateway SHALL route all API requests to the appropriate downstream service (`spatial-engine` for geospatial queries, `apps/server` for resource CRUD).
5. WHILE operating in WebRTC-only mode, THE Mesh_Node SHALL continue to accept and apply incoming Delta_Updates from peers and SHALL continue to emit Gossip_Protocol forwards.
6. THE Mesh_Node SHALL emit a `connectivity:changed` event with payload `{ mode: 'websocket' | 'p2p' | 'offline' }` whenever the active transport changes.

---

### Requirement 8: Node.js 22 Permission Model Sandbox

**User Story:** As a security engineer, I want the server process to be restricted to only the filesystem paths and network endpoints it legitimately needs, so that a supply-chain compromise cannot exfiltrate data or reach arbitrary hosts.

#### Acceptance Criteria

1. THE Gateway SHALL be started with `--experimental-permission --allow-fs-read=./src --allow-fs-write=./logs --allow-net=localhost:27017,localhost:6379` flags.
2. IF the server process attempts to read a filesystem path outside the declared `--allow-fs-read` scope, THEN THE Permission_Model SHALL throw an `ERR_ACCESS_DENIED` error and THE Gateway SHALL log the violation without crashing.
3. IF the server process attempts to open a network connection to a host not in the declared `--allow-net` scope, THEN THE Permission_Model SHALL throw an `ERR_ACCESS_DENIED` error.
4. THE Gateway SHALL declare all required `--allow-net` endpoints explicitly in its start script — wildcard `*` SHALL NOT be used.
5. THE Gateway start script SHALL be committed to the repository so that the permission flags are version-controlled and auditable.

---

### Requirement 9: CRDT State Serialization (Parser/Printer)

**User Story:** As a developer, I want to serialize and deserialize CRDT document state to and from a portable binary format, so that state can be stored in IndexedDB, transmitted over DataChannels, and replayed on reconnect.

#### Acceptance Criteria

1. THE Protocol_Package SHALL expose an `encodeState(doc: Y.Doc): Uint8Array` function that serializes the full document state.
2. THE Protocol_Package SHALL expose a `decodeState(update: Uint8Array, doc: Y.Doc): void` function that applies a serialized state to a document.
3. WHEN `decodeState` is called with a malformed or truncated `Uint8Array`, THE Protocol_Package SHALL throw a typed `CRDTDecodeError` with a descriptive message rather than silently corrupting the document.
4. THE Protocol_Package SHALL expose an `encodeStateVector(doc: Y.Doc): Uint8Array` and `decodeStateVector(sv: Uint8Array): Map<number, number>` pair for State_Vector serialization.
5. FOR ALL valid `Y.Doc` instances, `decodeState(encodeState(doc), new Y.Doc())` SHALL produce a document with equivalent content to the original (round-trip property).
6. FOR ALL valid State_Vectors, `decodeStateVector(encodeStateVector(doc))` SHALL produce a map equivalent to the original state vector (round-trip property).

---

### Requirement 10: Architecture Decision Record — CRDTs vs Locking

**User Story:** As a future maintainer, I want a documented rationale for why CRDTs were chosen over distributed locking, so that I can understand the trade-offs and make informed changes.

#### Acceptance Criteria

1. THE ADR SHALL be created at `docs/ADR-004-crdt-vs-locking.md` following the existing ADR format used in `docs/ADR-001-crdt-library-choice.md`.
2. THE ADR SHALL document the specific failure modes of distributed locking in a zero-trust, intermittently-connected environment.
3. THE ADR SHALL document the CRDT properties (commutativity, idempotency, associativity) that make Yjs suitable for this use case.
4. THE ADR SHALL include a Mermaid sequence diagram showing the state reconciliation process between two disconnected peers reconnecting.
5. THE ADR SHALL document the known limitations of the chosen approach, including the last-write-wins behaviour at the field level within Yjs `Y.Map`.

---

### Requirement 11: Scalability Under High Geospatial Update Load

**User Story:** As a platform operator, I want the system to handle 10,000 or more concurrent geospatial updates per minute without degrading response times, so that large-scale disaster events with many field agents remain coordinated.

#### Acceptance Criteria

1. THE Spatial_Engine SHALL use MongoDB `2dsphere` indexes on all geometry and location fields to ensure `$geoIntersects` queries complete within 50ms at the 95th percentile under a load of 10,000 concurrent updates.
2. THE Geofence_Service SHALL batch geofence checks for updates arriving within the same 100ms window into a single MongoDB aggregation query rather than issuing one query per update.
3. WHEN the Redis Pub/Sub adapter is configured, THE Gateway SHALL use it to broadcast geospatial events across all API instances so that horizontal scaling does not create split-brain alert delivery.
4. THE README SHALL include a "Scalability & Resilience" section documenting the batching strategy, index configuration, and horizontal scaling approach for 10,000+ concurrent geospatial updates.
5. WHILE the system is processing a batch of geospatial updates, THE Geofence_Service SHALL not block the Node.js event loop for more than 10ms per batch cycle.

---

### Requirement 12: Monorepo Service Structure

**User Story:** As a developer, I want the new services and packages to follow the established monorepo layout, so that tooling, imports, and CI pipelines work consistently.

#### Acceptance Criteria

1. THE Protocol_Package SHALL be created at `packages/protocol` and SHALL export its public API from a single `src/index.ts` entry point.
2. THE Spatial_Engine SHALL be created at `services/spatial-engine` with its own `package.json` and `tsconfig.json` following the conventions of `apps/server`.
3. THE Gateway SHALL be created at `services/gateway` with its own `package.json` and `tsconfig.json`.
4. THE `turbo.json` pipeline SHALL be updated to include `services/gateway` and `services/spatial-engine` in the `build`, `dev`, `lint`, and `test` task graphs.
5. ALL new packages and services SHALL import shared types exclusively from `@mirage/shared-types` and SHALL NOT duplicate type definitions.
6. THE `packages/protocol` package SHALL be added as a dependency of `apps/web`, `apps/server`, `services/gateway`, and `services/spatial-engine` in their respective `package.json` files.
