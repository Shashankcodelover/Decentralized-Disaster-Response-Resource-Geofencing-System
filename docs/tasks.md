# Project Mirage — Implementation Tasks (All Phases Completed) ✅

Each task is discrete and testable. Tasks within a phase can be parallelized unless marked with a dependency.

---

## Phase 0 — Infrastructure

### TASK-0.1: Monorepo bootstrap
- [x] Initialize `package.json` with npm workspaces
- [x] Configure `turbo.json` pipeline (build, dev, lint, test)
- [x] Create `apps/api`, `apps/web`, `packages/shared` workspace packages
- Test: `npm run build` completes without errors from root

### TASK-0.2: Shared package
- [x] Define TypeScript types: `DangerZone`, `ResourceHub`, `ResourceItem`, `Responder`, `GeofenceAlert`, `CRDTSyncPayload`, `SignalPayload`
- [x] Define `SOCKET_EVENTS` constants
- [x] Implement `encodeUpdate` / `decodeUpdate` CRDT helpers
- Test: `packages/shared` compiles with `tsc --noEmit`

### TASK-0.3: Environment configuration
- [x] Create `.env.example` with all required variables
- [x] Add Docker Compose file for MongoDB + Redis local dev
- Test: `docker compose up -d` starts both services healthy

---

## Phase 1 — API Core

### TASK-1.1: Express app + DB connection
- [x] Bootstrap Express with Helmet, CORS, JSON middleware
- [x] Implement `connectDB()` with Mongoose
- Test: `GET /health` returns `{ status: "ok" }` with 200

### TASK-1.2: Mongoose models with 2dsphere indexes
- [x] `DangerZone` model with `geometry: 2dsphere` index
- [x] `ResourceHub` model with `location: 2dsphere` index
- [x] `Responder` model with `location: 2dsphere` index
- Test: `db.dangerZones.getIndexes()` shows `2dsphere` on `geometry`

### TASK-1.3: Zones CRUD routes
- [x] `GET /api/zones` with optional `?bbox=` filter
- [x] `POST /api/zones`
- [x] `PUT /api/zones/:id`
- [x] `DELETE /api/zones/:id` (soft delete: `active: false`)
- Test: POST a polygon zone, GET returns it, DELETE soft-deletes it

### TASK-1.4: Resources CRUD routes
- [x] `GET /api/resources` with optional `?lng=&lat=` proximity sort
- [x] `POST /api/resources`
- [x] `PATCH /api/resources/:hubId/items/:itemId` — update stock quantity
- [x] `DELETE /api/resources/:id`
- Test: Create hub, update item quantity, verify `lastUpdated` changes

### TASK-1.5: Responders routes
- [x] `GET /api/responders`
- [x] `POST /api/responders`
- [x] `PATCH /api/responders/:id/location`
- Test: Update location, verify GeoPoint stored correctly

### TASK-1.6: Geofence check endpoint
- [x] `POST /api/geofence/check` — returns zones containing a point
- Test: Insert a polygon zone, POST a point inside it, verify it's returned

---

## Phase 2 — Real-Time Layer

### TASK-2.1: Socket.io server initialization
- [x] Initialize Socket.io on HTTP server
- [x] Attach Redis adapter when `REDIS_URL` is set
- Test: Two clients connect; message from one is received by the other

### TASK-2.2: Geofence event pipeline
- [x] Implement `handleGeofenceCheck` service with enter/exit state tracking
- [x] Wire `responder:location` socket event to geofence check
- [x] Emit `zone:enter` / `zone:exit` alerts to all clients
- Test: Simulate responder moving into a polygon; verify `zone:enter` fires once, not twice

### TASK-2.3: Resource real-time broadcast
- [x] After `PATCH /api/resources/:hubId/items/:itemId`, emit `resource:updated` via Socket.io
- [x] After `POST /api/resources`, emit `resource:created`
- [x] After `DELETE /api/resources/:id`, emit `resource:deleted`
- Test: Update stock via REST; connected client receives `resource:updated` within 500ms

### TASK-2.4: WebRTC signaling relay
- [x] Relay `peer:offer`, `peer:answer`, `peer:ice` between named peers
- [x] Emit `peer:left` on disconnect
- Test: Two browser tabs establish a DataChannel via the signaling relay

---

## Phase 3 — Frontend

### TASK-3.1: Vite + React 19 + Tailwind setup
- [x] Configure `vite.config.ts` with React plugin and API proxy
- [x] Configure Tailwind with dark slate theme
- Test: `npm run dev` serves the app at `localhost:5173`

### TASK-3.2: Geospatial Dashboard (Leaflet)
- [x] Render `MapContainer` with OSM tiles
- [x] Fetch and render `DangerZone` polygons with severity colors
- [x] Fetch and render `ResourceHub` markers with popups
- [x] Subscribe to `zone:created`, `zone:updated`, `resource:updated` for live updates
- Test: Add a zone via API; map updates without page refresh

### TASK-3.3: Resource Panel
- [x] Fetch and display all Resource Hubs with item quantities
- [x] Highlight low-stock items (< 10) in red
- [x] Subscribe to `resource:updated` for live quantity changes
- Test: Update stock via API; panel reflects new quantity within 500ms

### TASK-3.4: Alert Banner
- [x] Display `zone:enter` / `zone:exit` alerts with Framer Motion animation
- [x] Dismiss individual alerts
- [x] Cap displayed alerts at 5
- Test: Trigger a geofence event; banner appears and can be dismissed

### TASK-3.5: P2P Status indicator
- [x] Show server connection status (green/red)
- [x] Show active peer count
- [x] Show CRDT sync status (idle/syncing/synced/offline)
- Test: Disconnect from server; status shows "Offline" and peer count remains

---

## Phase 4 — Offline P2P Sync

### TASK-4.1: Yjs CRDT document setup
- [x] Initialize `Y.Doc` in `useP2PSync` hook
- [x] Map `ResourceHub` state to `Y.Map` structure
- Test: Two tabs share a Y.Doc; update in one reflects in the other

### TASK-4.2: WebRTC mesh formation
- [x] On `peer:joined`, initiate offer as initiator
- [x] Handle `peer:offer` as responder (create answer)
- [x] Exchange ICE candidates
- [x] Open DataChannel on connection
- Test: Three tabs form a full mesh (3 DataChannels)

### TASK-4.3: CRDT sync over DataChannel
- [x] On DataChannel open, send full `Y.encodeStateAsUpdate`
- [x] On DataChannel message, apply update with `Y.applyUpdate`
- [x] On local Y.Doc update, broadcast to all open channels
- Test: Disconnect server; update resource in Tab A; Tab B reflects change via P2P

### TASK-4.4: Server reconnect flush
- [x] On socket reconnect, emit all pending CRDT updates to server
- [x] Server relays to non-P2P peers
- Test: Go offline, make changes, reconnect; non-P2P client receives updates

---

## Phase 5 — Docker & Deployment

### TASK-5.1: Docker Compose (local dev)
- [x] `mongo` service with replica set (required for transactions)
- [x] `redis` service
- [x] `api` service with `--experimental-permission` flags
- [x] `web` service (Nginx static)
- Test: `docker compose up` → all services healthy

### TASK-5.2: Production hardening
- [x] Add rate limiting middleware (`express-rate-limit`)
- [x] Add JWT authentication middleware for write endpoints
- [x] Add input validation (`zod`) on all POST/PUT/PATCH routes
- [x] Configure CORS for production origin
- Test: Unauthenticated POST to `/api/zones` returns 401

### TASK-5.3: Observability
- [x] Add structured JSON logging (`pino`)
- [x] Expose `/metrics` endpoint (Prometheus format)
- [x] Add health check with DB + Redis connectivity status
- Test: `GET /health` returns `{ db: "ok", redis: "ok" }`
