# Project Mirage — Requirements (EARS Notation)

## 1. Geospatial Dashboard

**REQ-GEO-01** (Ubiquitous)
The system SHALL display a real-time map showing all active Danger Zones as colored polygons and all Resource Hubs as markers.

**REQ-GEO-02** (Event-Driven)
WHEN a Danger Zone is created or updated via the API, the system SHALL push the change to all connected clients within 500ms via WebSocket.

**REQ-GEO-03** (State-Driven)
WHILE a user is viewing the map, the system SHALL continuously reflect the latest zone severity using a color scale: green (low), amber (medium), red (high), purple (critical).

**REQ-GEO-04** (Optional)
WHERE a Mapbox token is configured, the system SHALL use Mapbox tiles; OTHERWISE it SHALL fall back to OpenStreetMap tiles.

---

## 2. Geofencing

**REQ-GEO-05** (Event-Driven)
WHEN a responder's GPS coordinates are received by the server, the system SHALL perform a MongoDB `$geoIntersects` query against all active Danger Zone polygons.

**REQ-GEO-06** (Event-Driven)
WHEN a responder transitions from outside to inside a Danger Zone, the system SHALL emit a `zone:enter` alert to all connected clients within 1 second.

**REQ-GEO-07** (Event-Driven)
WHEN a responder transitions from inside to outside a Danger Zone, the system SHALL emit a `zone:exit` alert to all connected clients within 1 second.

**REQ-GEO-08** (Unwanted Behavior)
The system SHALL NOT emit duplicate enter/exit alerts for the same responder-zone pair unless a state transition has occurred.

---

## 3. Offline-First P2P Sync

**REQ-P2P-01** (State-Driven)
WHILE the central server is unreachable, the system SHALL allow clients to sync resource state directly with other peers via WebRTC DataChannels.

**REQ-P2P-02** (Event-Driven)
WHEN a peer connects to the WebRTC mesh, the system SHALL exchange full Yjs CRDT state vectors to reconcile diverged state.

**REQ-P2P-03** (Event-Driven)
WHEN a local resource update is made offline, the system SHALL encode it as a Yjs update and broadcast it to all open DataChannels.

**REQ-P2P-04** (Event-Driven)
WHEN the central server reconnects, the system SHALL flush any pending CRDT updates to the server relay for propagation to non-P2P peers.

**REQ-P2P-05** (Ubiquitous)
The system SHALL use Yjs CRDTs to guarantee eventual consistency with no data loss regardless of the order updates are received.

**REQ-P2P-06** (Ubiquitous)
The system SHALL use Socket.io as a WebRTC signaling channel for offer/answer/ICE exchange.

---

## 4. Resource Tracking

**REQ-RES-01** (Ubiquitous)
The system SHALL support CRUD operations for Resource Hubs containing items of categories: food, medical, personnel, equipment.

**REQ-RES-02** (Event-Driven)
WHEN a resource item's quantity is updated, the system SHALL broadcast a `resource:updated` event to all connected clients.

**REQ-RES-03** (State-Driven)
WHILE a resource item's quantity is below 10 units, the system SHALL display the quantity in red on the Resource Panel.

**REQ-RES-04** (Optional)
WHERE a user's GPS location is available, the system SHALL sort Resource Hubs by proximity using MongoDB `$near`.

---

## 5. Non-Functional Requirements

**REQ-NFR-01** (Ubiquitous)
The system SHALL use MongoDB 2dsphere indexes on all geospatial fields to ensure query performance at scale.

**REQ-NFR-02** (Ubiquitous)
The system SHALL use Redis Pub/Sub via the Socket.io Redis adapter to support horizontal scaling across multiple API instances.

**REQ-NFR-03** (Ubiquitous)
The API SHALL use Node.js 22 Permission Model flags to restrict file system and network access to declared scopes only.

**REQ-NFR-04** (Ubiquitous)
All API responses SHALL include appropriate HTTP security headers via Helmet.js.

**REQ-NFR-05** (Ubiquitous)
The frontend SHALL remain functional (read-only map + P2P sync) with zero server connectivity.
