# Project Mirage — System Design

## Architecture Overview

Project Mirage is a Turborepo monorepo with three packages:

```
project-mirage/
├── apps/
│   ├── api/          Node.js 22 + Express + Socket.io
│   └── web/          React 19 + Vite + Leaflet + Yjs
└── packages/
    └── shared/       Types, constants, CRDT helpers
```

The system operates in two modes:
- **Online mode**: clients connect to the API; Socket.io relays real-time events; Redis scales horizontally.
- **Offline/P2P mode**: clients form a WebRTC mesh; Yjs CRDTs sync state without a server.

---

## Geospatial Data Flow

```mermaid
sequenceDiagram
    participant FieldAgent as Field Agent (Browser)
    participant API as API Server (Node.js)
    participant MongoDB as MongoDB (2dsphere)
    participant OtherClients as Other Clients

    FieldAgent->>API: PATCH /api/responders/:id/location {coordinates}
    API->>MongoDB: $geoIntersects query against DangerZones
    MongoDB-->>API: [matchedZones]
    API->>API: Compare with in-memory zone cache (enter/exit detection)
    API->>OtherClients: socket.emit("zone:enter" | "zone:exit", alert)
    OtherClients->>OtherClients: Display AlertBanner + update map

    Note over FieldAgent,OtherClients: Map updates flow separately
    API->>MongoDB: DangerZone.create / update
    MongoDB-->>API: saved zone
    API->>OtherClients: socket.emit("zone:created" | "zone:updated", zone)
    OtherClients->>OtherClients: Re-render Polygon on Leaflet map
```

---

## P2P Sync & CRDT Logic

```mermaid
sequenceDiagram
    participant PeerA as Peer A (Online)
    participant Server as Socket.io Server
    participant PeerB as Peer B (Online)
    participant PeerC as Peer C (Offline)

    Note over PeerA,PeerC: Phase 1 — Server-mediated signaling
    PeerA->>Server: peer:offer {to: PeerB, sdp}
    Server->>PeerB: peer:offer {from: PeerA, sdp}
    PeerB->>Server: peer:answer {to: PeerA, sdp}
    Server->>PeerA: peer:answer {from: PeerB, sdp}
    PeerA->>Server: peer:ice {to: PeerB, candidate}
    Server->>PeerB: peer:ice {from: PeerA, candidate}

    Note over PeerA,PeerB: Phase 2 — Direct DataChannel established
    PeerA->>PeerB: DataChannel open → send Y.encodeStateAsUpdate(ydoc)
    PeerB->>PeerA: Y.applyUpdate(ydoc, receivedUpdate)

    Note over PeerA,PeerC: Phase 3 — Server goes offline
    PeerA-xServer: connection lost
    PeerA->>PeerC: WebRTC DataChannel (already established)
    PeerA->>PeerC: crdt:{update: Uint8Array, peerId}
    PeerC->>PeerC: Y.applyUpdate(ydoc, update) — CRDT merge

    Note over PeerA,PeerC: Phase 4 — Server reconnects
    PeerA->>Server: socket.emit("crdt:update", pendingUpdates)
    Server->>PeerB: broadcast crdt:update to non-P2P peers
```

---

## CRDT Conflict Resolution

Yjs uses a **YATA (Yet Another Transformation Approach)** algorithm. Each operation is assigned a globally unique `(clientId, clock)` tuple. Concurrent inserts are resolved deterministically by clientId ordering, guaranteeing:

- **Commutativity**: `merge(A, B) = merge(B, A)`
- **Idempotency**: applying the same update twice has no effect
- **Associativity**: `merge(merge(A, B), C) = merge(A, merge(B, C))`

The shared `ResourceHub` state is stored in a `Y.Map` keyed by hub `_id`. Each resource item is a nested `Y.Map`. Updates to quantity are last-write-wins at the field level.

---

## MongoDB Schema & Indexes

```
DangerZone
  geometry: GeoPolygon  → index: 2dsphere
  severity: enum
  active: boolean

ResourceHub
  location: GeoPoint    → index: 2dsphere
  resources: [ResourceItem]

Responder
  location: GeoPoint    → index: 2dsphere
```

Key queries:
- `$geoIntersects` — point-in-polygon for geofence checks
- `$near` — proximity sort for resource discovery
- `$geoIntersects` with bbox Polygon — viewport-bounded zone fetch

---

## Socket.io + Redis Scaling

```mermaid
graph LR
    C1[Client 1] --> N1[API Node 1]
    C2[Client 2] --> N2[API Node 2]
    N1 <--> R[(Redis Pub/Sub)]
    N2 <--> R
    N1 --> C1
    N2 --> C2
    N1 -.broadcast.-> R -.-> N2 -.-> C2
```

The `@socket.io/redis-adapter` ensures events emitted on Node 1 are received by clients connected to Node 2.

---

## Security Model (Node.js 22 Permission Model)

The API is started with:
```
node --experimental-permission \
  --allow-fs-read=./src \
  --allow-net=localhost:27017,localhost:6379 \
  src/index.js
```

This restricts the process to only the declared filesystem paths and network endpoints, limiting blast radius of any supply-chain compromise.
