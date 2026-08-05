# 🚀 Decentralized Disaster Response System — Setup & File Inventory Guide

Welcome to the **Decentralized Disaster Response & Resource Geofencing System** repository! This document provides a complete setup walkthrough, environment variable reference, and a comprehensive inventory of all core files and their specific roles within the architecture.

---

## 📋 Quick Setup Walkthrough

### Method 1: Using Docker (Recommended — Instant Setup)

The easiest way to run the entire stack (API, Web, MongoDB Replica Set, Redis) is using Docker Compose:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Shashankcodelover/Decentralized-Disaster-Response-Resource-Geofencing-System.git
   cd Decentralized-Disaster-Response-Resource-Geofencing-System
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Build & Start Containers**:
   ```bash
   docker-compose up -d --build
   ```

4. **Access the Applications**:
   - 🌐 **Web Dashboard UI**: `http://localhost:3000`
   - ⚙️ **API Server Health Check**: `http://localhost:4000/health`

---

### Method 2: Manual Local Development Setup

If you prefer running Node.js directly on your local machine:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Infrastructure Services**:
   Ensure MongoDB (port `27017`) and Redis (port `6379`) are running on your machine.

3. **Run Development Mode**:
   ```bash
   npm run dev
   ```

4. **Run Unit & Integration Tests**:
   ```bash
   npm test
   ```

---

## 🔑 Environment Variables Configuration (`.env`)

Copy `.env.example` to `.env` before running the system. Here is a breakdown of every variable and its role:

| Variable Name | Default Value | Purpose & Role |
| :--- | :--- | :--- |
| `PORT` | `4000` | Specifies the port number the Express API server listens on. |
| `NODE_ENV` | `development` | Defines the execution mode (`development` or `production`). |
| `MONGO_URI` | `mongodb://localhost:27017/mirage` | MongoDB connection string (supports Replica Set mode for CRDT change streams). |
| `REDIS_URL` | `redis://localhost:6379` | Connection string for Redis pub/sub and Socket.io state adapter. |
| `JWT_SECRET` | `change_me_in_production` | Secret key used for signing and verifying JWT auth tokens. |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origin for Cross-Origin Resource Sharing security policy. |
| `STUN_SERVER` | `stun:stun.l.google.com:19302` | STUN server URL for WebRTC peer-to-peer connection discovery. |
| `TURN_SERVER` | `""` | TURN server URL for WebRTC fallback relay behind strict firewalls. |
| `MAPBOX_TOKEN` | `""` | Optional API token for Mapbox tiles (Leaflet OpenStreetMap fallback used by default). |

---

## 📁 Standard Repository File Inventory & Roles

This repository maintains a clean, production-grade file structure. Below is the list of key project files and the specific role each file plays:

| File / Directory | Role & Purpose in Architecture |
| :--- | :--- |
| **`docker-compose.yml`** | Defines multi-container orchestration for API, Web, MongoDB Replica Set (`rs0`), and Redis services. |
| **`apps/server/Dockerfile`** | Multi-stage Docker build recipe for compiling TypeScript API backend into a lightweight Node production container. |
| **`apps/web/Dockerfile`** | Multi-stage Docker build recipe for compiling React Vite frontend into a high-performance Nginx web server container. |
| **`apps/web/nginx.conf`** | Configures Nginx SPA (Single Page Application) routing fallback to prevent 404 errors on page refreshes. |
| **`package.json`** | Root NPM workspace definition, managing monorepo scripts (`dev`, `build`, `test`, `lint`) and Turbo repo orchestrator. |
| **`turbo.json`** | Turborepo pipeline configuration for caching and optimizing monorepo build, test, and lint tasks. |
| **`pnpm-workspace.yaml`** | Declares monorepo package locations (`apps/*`, `packages/*`) for workspace dependency resolution. |
| **`.gitignore`** | Specifies files ignored by Git (secrets `.env`, `node_modules/`, `dist/`, temp logs) to keep repo clean and secure. |
| **`.env.example`** | Safe template detailing all required environment keys without exposing sensitive credentials. |
| **`EXPLAINER.md`** | High-level system architecture document detailing CRDT P2P mesh, geofencing algorithms, and Socket.io sync. |
| **`CEO_EVALUATION_CHECKLIST.md`** | Comprehensive architectural evaluation audit tracking code quality, security posture, and production readiness. |
| **`JIRA_TRACKER.md`** | Sprint tracking and task breakdown documenting completed features, bug fixes, and roadmap items. |
| **`CHANGELOG_DAILY.md`** | Daily technical log recording findings, architectural refactoring, bug resolutions, and progress updates. |
| **`apps/server/`** | Contains Express API server code, MongoDB schemas, Socket.io handlers, and geofence evaluation logic. |
| **`apps/web/`** | Contains React SPA frontend, Leaflet map components, WebRTC P2P sync hooks, and UI dashboard. |
| **`packages/shared-types/`** | Monorepo shared package containing TypeScript interfaces for resources, geofences, and Socket events. |
| **`packages/crdt-logic/`** | Monorepo CRDT package implementing conflict-free replicated data types for peer-to-peer offline map sync. |
