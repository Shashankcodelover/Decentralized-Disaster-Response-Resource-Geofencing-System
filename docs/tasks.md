# 📋 TASKS & BACKLOG

## 🌐 Global Industry Leadership Tier (Deployed & Verified)
- [x] **Delay-Tolerant Networking (DTN) Bundle Protocol (RFC 9171 / RFC 5050)**: Store-Carry-and-Forward asynchronous epidemic gossip routing with custody transfer (`/api/v1/dtn`).
- [x] **Dynamic Risk-Weighted Evacuation Graph Router**: Multi-objective $A^*$ road graph solver with composite cost penalties for flood depth, radiation, road damage, and congestion (`/api/v1/evacuation/route`).
- [x] **Edge AI Aerial Computer Vision UAV Telemetry**: YOLOv8 bounding box stream processor, thermal anomaly tracker, and automatic beacon correlation (`/api/v1/drones/vision`).
- [x] **Decentralized Multi-Signature Emergency Governor (FEMA ICS-204)**: Cryptographic $M$-of-$N$ threshold consensus for mandatory evacuations and containment mandates (`/api/v1/governance/proposals`).
- [x] **Cursor-on-Target (CoT) XML Protocol**: Bidirectional ATAK, WinTAK, TAK Server & Meshtastic interoperability (`/api/v1/cot/feed` & `/inbound`).
- [x] **Certified MCI Triage Engine**: Implemented START and SALT algorithms with color codes (`RED`, `YELLOW`, `GREEN`, `BLACK`) & trauma hospital routing.
- [x] **Autonomous SAR Drone Flight Planner**: Lawnmower and Expanding-Square sweep patterns with ray-casting hazard polygon avoidance (+40m altitude climb).
- [x] **LoRa 24-Byte Binary Radio Mesh Codec**: Ultra-compact 24B frame with 24-bit quantized GPS ($\approx 1\text{m}$ resolution) & CRC-16-CCITT integrity.
- [x] **Predictive Resource Depletion Forecaster**: Dynamic burn-rate calculations and proactive inter-hub auto-rebalancing orders.
- [x] **Zero-Trust Anti-Spoofing Hardening**: Enforce `responderId === socket.user.sub` on socket telemetry and IDOR protection on location updates.
- [x] **Interactive Tactical Command HUD**: Integrated Web dashboard with live DTN bundles, evacuation solver, AI drone vision, and multi-sig council.
- [x] **Monorepo Test Suite**: **66/66 unit tests passing cleanly** across `@mirage/crdt-logic`, `@mirage/api`, and `@mirage/web` (100% pass rate).

## 🚨 Prior Sprint Focus (Hardened & Verified)
- [x] Secure all data routes with JWT auth (AI, IoT, Responders)
- [x] Implement Atomic Resource Transfers with MongoDB Transactions & Standalone Compensating Rollbacks
- [x] Integrate `y-indexeddb` for durable CRDT offline persistence
- [x] Enforce `[lng, lat]` coordinate convention universally
- [x] Enforce E2EE metadata (iv, authTag) & Direct Message MongoDB Persistence
- [x] Implement Public Key Infrastructure (PKI) for ECDH key agreements
- [x] Persist IoT Telemetry in MongoDB & Automate Threshold Alerts
- [x] Cryptographically Verify Blockchain Timeline Integrity (strict SHA-256 self-hash + prev-hash)
- [x] Implement Non-Blocking Rate Limiting & IPv6 Subnet Proxy Protection
- [x] Build High-Contrast Sunlight & Glare-Proof UI Theme for Outdoor Responders

## 🔮 Future Enhancements
- [ ] **Hardware Mesh Gateways**: Build LoRa / BLE hardware UART adapters for physical ESP32 / Heltec radio boards.
