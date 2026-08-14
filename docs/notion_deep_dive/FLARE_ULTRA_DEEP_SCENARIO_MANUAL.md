# 📡 FLARE: THE ENCYCLOPEDIC ARCHITECTURAL & SCENARIO-DRIVEN MASTER MANUAL
### *Complete Function-by-Function, Stack-by-Stack & Deep Failure Mode Specification for Senior Staff Interviews & Notion*

---

## 📑 TABLE OF CONTENTS
1. [SYSTEM IDENTITY & CORE PHILOSOPHY](#1-system-identity--core-philosophy)
2. [EXHAUSTIVE TECH STACK JUSTIFICATION MATRIX ("WHY THIS VS WHY NOT THAT")](#2-exhaustive-tech-stack-justification-matrix)
3. [REAL-WORLD DISASTER SCENARIOS & SYSTEM FLOW TRACES](#3-real-world-disaster-scenarios--system-flow-traces)
4. [FUNCTION-BY-FUNCTION DEEP-DIVE ENCYCLOPEDIA](#4-function-by-function-deep-dive-encyclopedia)
5. [MATHEMATICAL & RADIO-PHYSICS DERIVATIONS](#5-mathematical--radio-physics-derivations)
6. [FAILURE MODES, EDGE CASES & RECOVERY MECHANICS](#6-failure-modes-edge-cases--recovery-mechanics)

---

# 1. SYSTEM IDENTITY & CORE PHILOSOPHY

### The Fundamental Operating Premise
**FLARE** is built on one inviolable law of distributed systems: **"The cloud is a luxury, not a guarantee."**

In a Category-5 hurricane, high-magnitude earthquake, or armed conflict:
1. Fiber-optic cables rupture, severing terrestrial internet backhaul within minutes.
2. Cellular base stations (eNodeB/gNodeB) deplete their lead-acid battery backups in 2 to 4 hours.
3. Centralized DNS resolvers and cloud API gateways become 100% unreachable (`ETIMEDOUT`, `ENOTFOUND`).

**FLARE** replaces cloud dependencies with an autonomous, edge-native architecture executing across sub-GHz LoRa radio hardware, peer-to-peer PRoPHET Delay-Tolerant Networking, and state-based Conflict-Free Replicated Data Types (CRDTs).

---

# 2. EXHAUSTIVE TECH STACK JUSTIFICATION MATRIX

| Tech Layer | Selected Technology | Alternative Rejected | Why Selected? (The Winning Architectural Reason) | Why Rejected? (The Fatal Failure Mode of the Alternative) |
| :--- | :--- | :--- | :--- | :--- |
| **Physical RF Layer** | **Semtech SX1262 LoRa (868/915 MHz)** | Wi-Fi 6 (2.4/5 GHz) / Cellular 5G | Sub-GHz RF waves diffract around obstacles, penetrate multi-story concrete rubble, and achieve 5–15 km range with <100mW power. | Wi-Fi absorbs heavily in moisture and collapsed concrete, with range limited to ~50m. Cellular fails when base stations lose backhaul. |
| **State Sync Layer** | **Yjs (Binary State Vector CRDT)** | Automerge / Operational Transformation (OT) | Yjs uses dense binary delta encoding (lib0) with $O(1)$ memory state vector comparisons, ideal for 24-byte LoRa packets. | Automerge has high JSON serialization overhead (10x larger RAM footprint). OT requires a central coordinator server to linearize operations. |
| **Edge Storage** | **IndexedDB (Browser) + SQLite WAL (Node.js)** | LocalStorage / MongoDB Cloud | IndexedDB handles large binary blobs (tile maps, audio buffers) asynchronously. SQLite WAL allows non-blocking multi-reader queries with zero network overhead. | LocalStorage is synchronous (blocks UI event loop) and capped at 5MB. Cloud MongoDB crashes when internet connectivity drops. |
| **Cryptography** | **Hybrid Post-Quantum (Dilithium + Ed25519)** | RSA-4096 / Plain ECC | Protects emergency evacuation mandates against harvest-now-decrypt-later quantum attacks while preserving millisecond verification on edge CPUs. | Plain RSA is vulnerable to Shor's algorithm on quantum processors; RSA-4096 keys are too large for LoRa payloads. |
| **P2P Transport** | **PRoPHET DTN (Store-and-Forward Gossip)** | Standard TCP/IP Routing | Nodes store bundles in flash memory and relay them opportunistically when moving responders (Data Mules) come into physical RF range. | TCP requires end-to-end connected paths; in partitioned networks, TCP connection handshakes (`SYN/ACK`) fail instantly. |
| **Frontend Framework** | **React 19 + WebGL MapLibre** | Plain Leaflet / Standard DOM Map | WebGL renders 50,000 dynamic casualty points, UAV flight transects, and chemical plume contours at 60 FPS on low-power mobile GPUs. | Plain DOM/SVG map renderers lag and crash browser tabs when rendering complex polygon contours with thousands of points. |

---

# 3. REAL-WORLD DISASTER SCENARIOS & SYSTEM FLOW TRACES

---

### 🚨 SCENARIO A: Basement Casualty Triage in a Total Cellular Blackout
* **Context**: A 7.8 magnitude earthquake collapses the top floors of a hospital. A paramedic is in the underground radiology basement with zero cellular signal and zero Wi-Fi.
* **The Action**: Paramedic finds a trapped 8-year-old child who is unconscious, breathing at 8 breaths/min with a weak pulse.

```
 [ Paramedic Phone UI ] ──(Selects: Age 8yr, RR 8, Pulse YES)──> [ triageEngine.ts: classifyPediatricJumpStart() ]
                                                                                  │
                                                                                  ▼
 [ Outcome: IMMEDIATE (RED) ] ──(Generates: 5 Rescue Breaths Alert) ──> [ crdt-logic: useP2PSync Local State Bump ]
                                                                                  │
                                                                                  ▼
 [ 24-Byte Serialization ]    ──(loraMeshCodec.ts: packs lat, lon, triage, id) ──> [ loraUartGateway.ts: SLIP Framing ]
                                                                                  │
                                                                                  ▼
 [ Transmit via LoRa RF ]     ──(SX1262 Transceiver SF10/125kHz, 915MHz)       ──> [ Radio Packet Broadcasts (No Gateway ACK) ]
                                                                                  │
                                                                                  ▼
 [ Offline Store & Forward ]  ──(dtnEpidemicRouter.ts: stores in flash memory)  ──> [ Paramedic moves upstairs -> Encounters Search Dog Mule ]
                                                                                  │
                                                                                  ▼
 [ Contact Gossip Transfer ]  ──(Bloom Filter Vector Match -> Drops Duplicates) ──> [ Incident Commander Dashboard: RED Alert Received ]
```

#### Step-by-Step Execution Trace:
1. **`triageEngine.ts -> classifyPediatricJumpStart({ ageMonths: 96, respirations: 8, palpablePulse: true, avpu: 'UNRESPONSIVE' })`**:
   * Respiratory rate $<15\text{ bpm}$ triggers the pediatric respiratory failure branch.
   * Classifies patient as **`IMMEDIATE_RED`**.
   * Sets tourniquet ischemia timer and medical evacuation priority rank $1$.
2. **`useP2PSync -> yDoc.getMap('casualties').set('CAS_001', payload)`**:
   * Mutates local Yjs document.
   * State vector clock increments from `[ClientA: 12]` to `[ClientA: 13]`.
3. **`loraMeshCodec.ts -> serializeTelemetry(telemetry)`**:
   * Packs Latitude ($37.7749$) into a 32-bit signed integer ($\text{lat} \times 10^7$).
   * Packs Longitude ($-122.4194$) into a 32-bit signed integer.
   * Packs Triage Category (`0x01` for RED) into 4 bits.
   * Computes CRC-16 polynomial checksum (`0xA001`).
   * Output buffer size: **exactly 24 bytes**.
4. **`dtnEpidemicRouter.ts -> ingestBundle(bundle)`**:
   * Evaluates priority: `CRITICAL_SOS` (Priority 10).
   * Generates a 64-bit Bloom filter summary vector.
   * Stores bundle in flash memory.
5. **Physical Data Mule Transfer**:
   * Paramedic climbs stairs to Ground Floor and passes a Search & Rescue K9 Handler wearing an ESP32 LoRa node.
   * Nodes exchange Bloom filters in 12ms. The K9 node identifies missing bundle `CAS_001` and ingests it.
   * The K9 handler walks within range of the Base Camp Command Center; the bundle is delivered in $<50\text{ms}$.

---

### 🚨 SCENARIO B: Chemical Factory Explosion & Toxic Plume Dispersion
* **Context**: An industrial explosion releases $500\text{ g/s}$ of Chlorine gas ($Cl_2$) with a 4.5 m/s North-East wind under Pasquill-Gifford Stability Class D (Neutral overcast).
* **The Action**: The system must calculate the exact toxic boundary contour ($C \ge 0.5\text{ mg/m}^3$) and redirect civilian evacuation routes away from the expanding gas cloud.

```
 [ Sensor Ingestion: Q=500g/s, Wind=4.5m/s, Class D ] ──> [ atmosphericPlumeEngine.ts: computeGaussianPlumeConcentration() ]
                                                                            │
                                                                            ▼
 [ Hazard Contour Generation ]                        ──> [ evacuationRouter.ts: calculateSafeCorridor() ]
                                                                            │
                                                                            ▼
 [ Dynamic Dijkstra Graph Reweighting ]               ──> [ Blocks Edges inside Toxic Contour (Weight = Infinity) ]
                                                                            │
                                                                            ▼
 [ Civilian Device Push via LoRa / Mesh ]             ──> [ WebGL Tactical Map renders Safe Green Navigation Corridor ]
```

---

# 4. FUNCTION-BY-FUNCTION DEEP-DIVE ENCYCLOPEDIA

---

### 📁 MODULE: `packages/crdt-logic/src/dtnEpidemicRouter.ts`

#### 1. `ingestBundle(bundle: DTNBundle, currentTimeMs: number): IngestResult`
* **Signature**:
  ```typescript
  ingestBundle(bundle: DTNBundle, currentTimeMs?: number): { accepted: boolean; reason?: string }
  ```
* **Concepts Used**: Store-and-Forward DTN, Dynamic Priority Queue, Time-To-Live (TTL) Decay, Bounded Memory Allocation.
* **Exact Internal Mechanics**:
  1. Checks if `this.deliveryAcks.has(bundle.bundleId)`. If true, rejects bundle immediately (`ALREADY_DELIVERED_ACK_EXISTS`).
  2. Calculates bundle age: $\text{age} = (\text{currentTime} - \text{creationTimestamp})/1000$. If $\text{age} > \text{ttlSeconds}$, drops bundle (`BUNDLE_EXPIRED_TTL`).
  3. Checks available storage capacity: `currentStorageBytes + bundle.payloadBytes > maxStorageBytes`.
  4. If storage is full, calls `evictLowestPriorityBundle()` in a loop until enough bytes are freed.
  5. Inserts bundle into `this.bundleStore` and increments `currentStorageBytes`.
* **Why this design?** In off-grid disasters, edge node memory is strictly bounded (e.g. 4MB SPIFFS flash on ESP32). A naive FIFO buffer would drop life-saving medical alerts when routine GPS telemetry floods the queue.
* **Failure Scenario if not used**: Critical survivor SOS messages would be dropped, causing fatal delays in search and rescue dispatch.

---

#### 2. `reconcileVectors(peerSummaryVector: Uint8Array): string[]`
* **Signature**:
  ```typescript
  reconcileVectors(peerSummaryVector: Uint8Array): string[]
  ```
* **Concepts Used**: Anti-Entropy Gossip Protocol, Bitwise Bloom Filter Querying, Set Difference Minimization.
* **Exact Internal Mechanics**:
  1. Iterates through all local bundles in `this.bundleStore`.
  2. Hashes each local `bundleId` using two independent hash functions ($H_1, H_2$).
  3. Checks if the corresponding bit indices in `peerSummaryVector` are set to `1`.
  4. If any bit is `0`, the peer definitely does not possess the bundle; appends `bundleId` to the transfer list.
  5. Returns the minimal array of missing bundles to transmit over radio.
* **Why this design?** Exchanging raw bundle ID strings over LoRa wastes precious bandwidth (36 bytes per UUID). A 64-bit Bloom filter compresses an entire node's catalog into 8 bytes.

---

#### 3. `acknowledgeDelivery(bundleId: string, maxAckHistory: number = 10000): void`
* **Signature**:
  ```typescript
  acknowledgeDelivery(bundleId: string, maxAckHistory?: number): void
  ```
* **Concepts Used**: Bounded LRU Tombstone Eviction, Memory Leak Prevention, Idempotent Deletion.
* **Exact Internal Mechanics**:
  1. Removes the bundle from `this.bundleStore` and deducts its size from `currentStorageBytes`.
  2. Adds `bundleId` to `this.deliveryAcks` set.
  3. If `this.deliveryAcks.size > maxAckHistory`, converts the set to an array, evicts the oldest entry, and updates the set.
* **Why this design?** Prevents memory accumulation in long-running gateway nodes operating for weeks.

---

### 📁 MODULE: `packages/crdt-logic/src/satelliteRelayEngine.ts`

#### 4. `encodeCospasSarsatFrame(beaconHexId: string, emergencyCode: number, lat: number, lon: number): string`
* **Signature**:
  ```typescript
  encodeCospasSarsatFrame(beaconHexId: string, emergencyCode: number, lat: number, lon: number): string
  ```
* **Concepts Used**: Bitwise Bit-Packing, Hexadecimal Framing, ITU / COSPAS-SARSAT T.001 Standard Protocol.
* **Exact Internal Mechanics**:
  1. Validates 15-character Hexadecimal Beacon Unique ID.
  2. Packs 1-bit synchronization flag (`1`), 1-bit format flag (`0` for Standard Location Protocol).
  3. Encodes Country Code (10 bits) and Emergency Category Code (4 bits: Fire, Medical, Structure Collapse).
  4. Quantizes Latitude into 0.05-degree resolution sign/magnitude bits (9 bits).
  5. Quantizes Longitude into 0.05-degree resolution sign/magnitude bits (10 bits).
  6. Computes BCH (Bose-Chaudhuri-Hocquenghem) error-correcting code across bits 25–85.
  7. Formats the output as a standard 144-bit (36-character) Hexadecimal Satellite Burst Frame.

---

#### 5. `computeDopplerShift(f0: number, satelliteVelocity: number, elevationAngleDeg: number): number`
* **Signature**:
  ```typescript
  computeDopplerShift(f0: number, satelliteVelocity: number, elevationAngleDeg: number): number
  ```
* **Concepts Used**: Relativistic Wave Mechanics, Orbital Mechanics, Frequency Pre-Compensation.
* **Formula**:
  $$\Delta f = f_0 \cdot \frac{v_{\text{sat}}}{c} \cdot \cos(\theta)$$
* **Why this design?** Low Earth Orbit (LEO) satellites (like Iridium or SAR-Lupe) pass overhead at $7,500\text{ m/s}$. At 406.05 MHz, this causes a Doppler shift of up to $\pm 7.1\text{ kHz}$, causing satellite transponders to lose RF lock unless pre-compensated.

---

### 📁 MODULE: `packages/crdt-logic/src/uavSwarmVoronoiEngine.ts`

#### 6. `computeVoronoiSectors(drones: UAVNode[], searchPerimeter: GeoPolygon): VoronoiSector[]`
* **Signature**:
  ```typescript
  computeVoronoiSectors(drones: UAVNode[], searchPerimeter: GeoPolygon): VoronoiSector[]
  ```
* **Concepts Used**: Computational Geometry, Fortune's Sweep-Line Algorithm, Convex Polygon Clipping (Sutherland-Hodgman).
* **Exact Internal Mechanics**:
  1. Generates 2D Delaunay triangulation between all active UAV GPS positions.
  2. Constructs perpendicular bisectors for all Delaunay edges to form Voronoi cell boundaries.
  3. Clips each Voronoi cell against the disaster search boundary polygon.
  4. Calculates the center of mass (centroid) of each sector and assigns optimal parallel search sweep lines (lawnmower pattern) to each drone.
* **Why this design?** Guarantees zero duplicate search paths and zero collisions between autonomous drones searching collapsed terrain.

---

#### 7. `calculateRthEnvelope(batteryPercent: number, distanceToBaseMeters: number, windSpeedMps: number): RTHResult`
* **Signature**:
  ```typescript
  calculateRthEnvelope(batteryPercent: number, distanceToBaseMeters: number, windSpeedMps: number): RTHResult
  ```
* **Concepts Used**: Aeronautical Energy Budgeting, Headwind Drag Resistance, Fail-Safe Return-To-Home (RTH).
* **Formula**:
  $$t_{\text{return}} = \frac{d}{v_{\text{cruise}} - v_{\text{wind}}}, \quad \text{Energy}_{\text{needed}} = t_{\text{return}} \cdot P_{\text{motor}} \times 1.25 \quad (25\% \text{ safety margin})$$
* **Why this design?** Prevents autonomous search drones from running out of battery and crashing into disaster zones.

---

### 📁 MODULE: `packages/crdt-logic/src/waterBiohazardEngine.ts`

#### 8. `model1DPlumeAdvectionDispersion(M: number, A: number, D: number, u: number, x: number, t: number): number`
* **Signature**:
  ```typescript
  model1DPlumeAdvectionDispersion(M: number, A: number, D: number, u: number, x: number, t: number): number
  ```
* **Concepts Used**: 1D Taylor Hydrodynamic Dispersion, Partial Differential Equations (PDE), Fick's Second Law.
* **Formula**:
  $$C(x, t) = \frac{M}{A \sqrt{4 \pi D t}} \exp\left( -\frac{(x - u t)^2}{4 D t} \right)$$
* **Why this design?** When toxic contaminants spill into rivers feeding refugee camps, this calculates the exact minute the toxic peak concentration will reach water intake pumps.

---

### 📁 MODULE: `packages/crdt-logic/src/disasterVoucherVault.ts`

#### 9. `redeemVoucher(voucherId: string, secretKey: string, nullifierTree: MerkleTree): RedeemResult`
* **Signature**:
  ```typescript
  redeemVoucher(voucherId: string, secretKey: string, nullifierTree: MerkleTree): RedeemResult
  ```
* **Concepts Used**: Merkle Trees, Cryptographic Nullifiers, Double-Spend Prevention, Zero-Knowledge Offline Verification.
* **Exact Internal Mechanics**:
  1. Computes nullifier: $\text{Nullifier} = \text{HMAC-SHA256}(\text{voucherId}, \text{secretKey})$.
  2. Queries the local Merkle Tree: `nullifierTree.contains(Nullifier)`.
  3. If found, rejects claim immediately (`DOUBLE_SPEND_ATTEMPT_DETECTED`).
  4. If not found, appends the nullifier to the tree, recalculates the Merkle Root hash, and approves food/insulin distribution.
* **Why this design?** In refugee camps without internet, bad actors try to claim food rations multiple times across different aid tents. Nullifier trees make double-claiming mathematically impossible even without a central server.

---

### 📁 MODULE: `packages/crdt-logic/src/loraMeshCodec.ts`

#### 10. `serializeTelemetry(data: TelemetryPayload): Uint8Array`
* **Signature**:
  ```typescript
  serializeTelemetry(data: TelemetryPayload): Uint8Array
  ```
* **Concepts Used**: Binary Bit-Packing, IEEE 754 Quantization, CRC-16 Checksum.
* **Memory Layout (24 Bytes)**:
  * Bytes 0–3: Latitude (32-bit signed int, resolution $10^{-7}$ degrees).
  * Bytes 4–7: Longitude (32-bit signed int, resolution $10^{-7}$ degrees).
  * Byte 8: Altitude (16-bit unsigned int, $-500\text{m}$ to $+8000\text{m}$).
  * Byte 9: Triage Category (4 bits) + Patient Count (4 bits).
  * Byte 10: Battery Percentage (7 bits) + SOS Flag (1 bit).
  * Bytes 11–14: Unix Epoch Timestamp (32-bit unsigned int).
  * Bytes 15–21: Node Identity Hash (56-bit truncated SHA-256).
  * Bytes 22–23: CRC-16-CCITT Checksum (`0x1021`).

---

# 5. MATHEMATICAL & RADIO-PHYSICS DERIVATIONS

### A. LoRa Link Budget & Sensitivity Derivation
Thermal noise floor equation:
$$N = -174\text{ dBm/Hz} + 10 \log_{10}(\text{BW}) + \text{NF}$$
For $\text{BW} = 125\text{ kHz}$ and Noise Figure $\text{NF} = 6\text{ dB}$:
$$N = -174 + 10 \log_{10}(125000) + 6 = -174 + 51 + 6 = -117\text{ dBm}$$
SX1262 receiver sensitivity at Spreading Factor $\text{SF} = 12$ (SNR limit $-20\text{ dB}$):
$$S = N + \text{SNR}_{\text{limit}} = -117 - 20 = -137\text{ dBm}$$
Maximum Path Loss:
$$\text{PL}_{\text{max}} = P_{\text{tx}} - S = +22\text{ dBm} - (-137\text{ dBm}) = 159\text{ dB}$$
**Significance**: A link budget of 159 dB allows signals to penetrate through 3 concrete buildings or 12 km of rural terrain.

---

# 6. FAILURE MODES, EDGE CASES & RECOVERY MECHANICS

### 1. The ALOHA Collision Storm (Radio Congestion)
* **The Problem**: If 500 survivor nodes simultaneously broadcast SOS packets upon earthquake impact, packets collide in the air and destroy each other (Pure ALOHA channel collapse).
* **The FLARE Fix**: Implemented **Channel Activity Detection (CAD)** with exponential backoff timers:
  $$t_{\text{backoff}} = \text{Random}(1, 2^c) \times T_{\text{sym}} \times 16$$
  If CAD detects an active preamble, transmission pauses and hops to a pseudorandom orthogonal Spreading Factor.

### 2. The Byzantine GPS Spoofing Attack
* **The Problem**: An adversary transmits fake GPS coordinates to divert rescue teams to empty locations.
* **The FLARE Fix**: The system cross-references GPS telemetry with **LoRa TDoA (Time Difference of Arrival)** across 3 receiving gateway towers. If the geometric hyperbolic range does not match the reported GPS coordinate within 150 meters, the packet is flagged as `SPOOFED_TELEMETRY` and quarantined.

---

> **FLARE Master Encyclopedic Scenario Manual is compiled and saved.**
