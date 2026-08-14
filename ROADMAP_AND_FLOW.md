# 🗺️ ROADMAP & SYSTEM FLOW

## Core Architecture Flow

### 1. Data Ingestion (Telemetry & Beacons)
- **Edge Sensors / IoT**: Feed real-time data to `/api/v1/iot/telemetry`.
- **Victim Smartphones**: Emit `EmergencyBeacon` payloads via P2P CRDT sync or HTTP fallback.
- **Responders**: Emit GPS updates via authenticated WebSocket (`responder:location`).

### 2. Geofence & AI Processing
- Socket intercepts `responder:location`, normalizes coordinates `[lng, lat]`.
- `local_geofencer.ts` runs ray-casting math to detect boundary intersections.
- If intersecting a high-danger zone, a `zone:enter` alert is broadcasted.
- `locationPrivacy.ts` blurs exact GPS to ~100m grid resolution before rebroadcasting to the general channel.

### 3. Resource Logistics
- Needs are aggregated by the AI Logistics Service (`predictive-burn`).
- Hubs execute **Atomic Transfers** (`executeResourceTransfer`) via MongoDB transactions.
- All transfers are cryptographically hashed and appended to the **Incident Timeline**.

### 4. P2P Mesh Sync (Offline Mode)
- Browsers establish WebRTC DataChannels using `useP2PSync`.
- Yjs CRDT payloads (`Uint8Array`) are exchanged directly between phones.
- `IndexeddbPersistence` saves the Yjs document durably in browser storage.
- When cellular returns, the mesh syncs the merged Y.Doc up to the central server.

---

## Technical Roadmap

| Phase | Description | Status |
| :--- | :--- | :--- |
| **V1** | Core API, basic auth, unencrypted comms | ✅ Done |
| **V2** | Yjs CRDT + WebRTC mesh, basic geofencing | ✅ Done |
| **V3** | JWT Socket Auth, Privacy Blurring, Security Hardening | ✅ Done |
| **V4** | Atomic Logistics, Blockchain Incident Timeline | ✅ Done |
| **V5** | IndexedDB Offline Persistence, E2EE Enforcements | ✅ Done |
| **V6** | Client-side E2EE Crypto implementations | ⏳ Planned |
| **V7** | LoRaWAN / Bluetooth LE Hardware Adapters | ⏳ Planned |
