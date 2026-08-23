# 🧭 EXPLORE GUIDE

Welcome to the Decentralized Disaster Response System. This monorepo is divided into several purpose-built packages. Here is your guide to navigating the codebase.

## Directory Structure

```text
Decentralized-Disaster-Response-Resource-Geofencing-System/
├── apps/
│   ├── server/                   # Core Node.js Express/Socket.io backend
│   │   ├── src/
│   │   │   ├── models/           # MongoDB schemas (ResourceHub, Message, TransferAuditLog)
│   │   │   ├── routes/           # REST APIs (dtn, evacuation, droneVision, governance, cot, triage, etc.)
│   │   │   ├── services/         # Business logic (Geofencing, SupplyPredictor, Timeline)
│   │   │   └── socket.ts         # Real-time WebSocket handlers, anti-spoofing & rate limiters
│   └── web/                      # React/Vite Tactical Dashboard
│       └── src/components/       # TacticalHub, IncidentMap, MeshTopology, CommandHeader
├── packages/
│   ├── crdt-logic/               # Offline-first & distributed algorithms
│   │   ├── src/dtnProtocol.ts    # Store-Carry-and-Forward DTN Bundle Protocol (RFC 9171 / 5050)
│   │   ├── src/evacuationRouter.ts # Dynamic Risk-Weighted A* Evacuation Graph Solver
│   │   ├── src/droneVisionEngine.ts # Edge AI Aerial UAV Computer Vision Telemetry Ingestion
│   │   ├── src/emergencyGovernor.ts # Decentralized M-of-N Multi-Sig Emergency Governor (FEMA ICS-204)
│   │   ├── src/cotProtocol.ts    # ATAK Cursor-on-Target (CoT) XML Protocol Bridge
│   │   ├── src/triageEngine.ts   # Certified START/SALT Mass Casualty Triage Engine
│   │   ├── src/dronePathEngine.ts # Autonomous SAR Drone Flight Planner with Hazard Avoidance
│   │   ├── src/loraMeshCodec.ts  # Ultra-compact 24-byte binary radio codec with CRC-16
│   │   ├── src/geofenceEngine.ts # Distance & privacy math
│   │   └── src/useP2PSync.ts     # React hook for WebRTC DataChannel sync + IndexedDB
│   ├── shared/                   # Shared utilities (Geo JSON math)
│   └── shared-types/             # TypeScript interfaces (Socket events, Priorities)
└── docs/                         # Audit reports & Daily Changelogs
```

## Key Files to Understand

1. **`packages/crdt-logic/src/dtnProtocol.ts`** & **`apps/server/src/routes/dtn.ts`**
   Delay-Tolerant Networking (DTN) Bundle Protocol engine for store-carry-and-forward epidemic gossip routing in infrastructure-free disaster mesh networks.

2. **`packages/crdt-logic/src/evacuationRouter.ts`** & **`apps/server/src/routes/evacuation.ts`**
   Dynamic risk-weighted evacuation graph solver using composite-cost $A^*$ to route victims safely away from road debris, fire plumes, radiation, and congestion bottlenecks.

3. **`packages/crdt-logic/src/droneVisionEngine.ts`** & **`apps/server/src/routes/droneVision.ts`**
   Edge AI Aerial Computer Vision telemetry engine for ingesting real-time UAV bounding boxes (survivors, trapped victims, wildfires, floods) with automatic beacon correlation.

4. **`packages/crdt-logic/src/emergencyGovernor.ts`** & **`apps/server/src/routes/governance.ts`**
   Decentralized multi-signature emergency governance engine enforcing $M$-of-$N$ cryptographic sign-off for FEMA ICS-204 incident mandates.

5. **`packages/crdt-logic/src/cotProtocol.ts`** & **`apps/server/src/routes/cot.ts`**
   Cursor-on-Target (CoT) XML serialization & parsing bridge for seamless interoperability with ATAK, WinTAK, and TAK Server.

6. **`packages/crdt-logic/src/triageEngine.ts`** & **`apps/server/src/routes/triage.ts`**
   Certified START and SALT mass casualty disaster triage decision engine with automated trauma hospital capacity routing.

7. **`packages/crdt-logic/src/dronePathEngine.ts`** & **`apps/server/src/routes/dronePlanning.ts`**
   Autonomous Search & Rescue (SAR) flight path generator (Lawnmower sweep and Expanding Square search) with ray-casting hazard avoidance.

8. **`packages/crdt-logic/src/loraMeshCodec.ts`**
   Ultra-compact 24-byte binary radio mesh codec with 24-bit quantized GPS coordinates and CRC-16 integrity.

9. **`apps/web/src/components/TacticalHub.tsx`**
   The unified browser tactical command center with interactive tabs for DTN queues, evacuation corridors, drone AI vision streams, multi-sig council, START triage, and LoRa packet streams.

10. **`apps/server/src/socket.ts`**
    The real-time communications engine with JWT authentication, anti-spoofing ownership verification, and GPS coordinate anonymization.

## How to Test and Verify
- Run `npm test` across the monorepo to execute all 66 unit tests.
- Run `npx turbo run build` to verify type-checking and bundling across all packages.
