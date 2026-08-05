# Decentralized Disaster Response & Resource Geofencing System (Project Mirage)

A state-of-the-art emergency management platform designed for resilient coordination during natural disasters when centralized cloud and cellular infrastructure fail.

---

## 🚀 Key Features

- **Real-time Geofencing Engine**: Automated alerts when responders enter or exit critical danger zones using MongoDB Geospatial (`2dsphere`) indexing.
- **Offline-First P2P Mesh Sync**: Resilient peer-to-peer data synchronization over WebRTC DataChannels using **Yjs CRDTs** (Conflict-free Replicated Data Types).
- **Interactive Command Dashboard**: Live Leaflet map visualization of hazard zones, active responders, resource hubs, and AI-optimized evacuation routes.
- **Mission-Critical Crash Resilience**: Protected by a top-level **React Error Boundary** with automated recovery diagnostics, preventing full dashboard outages during crisis operations.
- **Production-Ready Docker Containers**: Full multi-container Docker Compose setup for API, Web (Nginx SPA fallback), MongoDB Replica Set (`rs0`), and Redis.

---

## 🛠 Tech Stack

- **Monorepo Architecture**: Turborepo, npm workspaces (`apps/server`, `apps/web`, `packages/*`)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion, Leaflet Maps, Yjs
- **Backend API**: Node.js v20/v22, Express, Socket.io, Mongoose (MongoDB 2dsphere), Pino
- **Resilience Layer**: WebRTC P2P DataChannels, Yjs CRDT logic, React Error Boundaries
- **Containerization**: Docker, Docker Compose, Nginx Alpine

---

## 📦 Monorepo Structure

```text
Decentralized-Disaster-Response-Resource-Geofencing-System/
├── apps/
│   ├── server/           # Express API, Socket.io, MongoDB models, Dockerfile
│   └── web/              # React 19 Leaflet dashboard, Nginx SPA config, Dockerfile
├── packages/
│   ├── crdt-logic/       # Yjs CRDT synchronization helpers & useP2PSync hook
│   ├── shared-types/     # TypeScript interfaces & socket event constants
│   ├── shared/           # Shared utility exports
│   └── ui/               # Shared UI component library (Badge, Button, Card, StatusDot)
├── docker-compose.yml    # Multi-container orchestration (API, Web, Mongo, Redis)
├── SETUP.md              # Detailed setup guide & file inventory breakdown
├── EXPLAINER.md           # Deep-dive system architecture explainer
└── CHANGELOG_DAILY.md    # Daily development log & audit history
```

---

## ⚡ Quick Start

### Option 1: Docker Compose (Recommended — Instant Setup)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Build & launch containers
docker-compose up -d --build
```

- 🌐 **Web Dashboard UI**: `http://localhost:3000`
- ⚙️ **API Server Health Check**: `http://localhost:4000/health`

### Option 2: Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev mode
npm run dev

# 3. Run unit & integration tests
npm test
```

---

## 📚 Complete Documentation & File Inventory

For a comprehensive guide on environment variables, setup instructions, and a file-by-file inventory of all roles in the project, please see:
📖 **[SETUP.md](SETUP.md)**

---

## 🌐 Vision

Providing a decentralized, open-source infrastructure for humanitarian organizations to coordinate life-saving efforts without relying on single points of failure.
