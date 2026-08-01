# Decentralized Disaster Response System (V1)

A state-of-the-art emergency management platform designed for resilient coordination during natural disasters.

## 🚀 Features
- **Real-time Geofencing**: Automated alerts when responders enter or exit critical danger zones using MongoDB Geospatial indexing.
- **P2P Synchronization**: Resilient data syncing using CRDT (Conflict-free Replicated Data Types) to handle intermittent network connectivity.
- **Live Monitoring Dashboard**: Interactive Map visualization of active zones, responder locations, and resource status.
- **AI-Assisted Dispatch**: Intelligent simulation and optimization of volunteer resource allocation.

## 🛠 Tech Stack
- **Monorepo**: Turborepo, pnpm
- **Frontend**: React, Tailwind CSS, Framer Motion, Leaflet
- **Backend**: Node.js, Express, Socket.io, MongoDB
- **Resilience**: P2P Sync, CRDT

## 📦 Setup & Installation
1. **Prerequisites**: Node.js v18+, pnpm, MongoDB.
2. **Installation**:
   ```bash
   pnpm install
   ```
3. **Run Services**:
   ```bash
   pnpm run dev
   ```

## 🌐 Vision
Providing a decentralized, open-source infrastructure for humanitarian organizations to coordinate life-saving efforts without relying on centralized cloud providers that often fail during disasters.
