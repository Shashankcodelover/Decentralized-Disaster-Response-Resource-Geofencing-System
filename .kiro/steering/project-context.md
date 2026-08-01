---
inclusion: always
---

# Project Mirage — Kiro Steering Context

## What this project is
A decentralized disaster response coordination system. It works in low-bandwidth and fully offline environments using WebRTC P2P sync and Yjs CRDTs.

## Monorepo structure
- `apps/web` — React 19 frontend (Vite, Tailwind, Leaflet, Framer Motion)
- `apps/server` — Node.js 22 backend (Express, Socket.io, Mongoose)
- `packages/shared-types` — All TypeScript interfaces and socket event constants
- `packages/crdt-logic` — Yjs CRDT helpers + `useP2PSync` React hook
- `packages/ui` — Shared Tailwind/Framer Motion components (Button, Card, Badge, StatusDot)
- `docs/` — Architecture Decision Records (ADRs)

## Key conventions
- All socket event names come from `SOCKET_EVENTS` in `@mirage/shared-types` — never hardcode strings
- GeoJSON coordinates are always `[longitude, latitude]` (not lat/lng) — Leaflet needs them flipped to `[lat, lng]`
- MongoDB models use `2dsphere` indexes on all geometry/location fields
- The `geofenceService` tracks enter/exit transitions in memory — stateless restarts lose this cache (known limitation, see ADR-002)
- `useP2PSync` from `@mirage/crdt-logic` is the single source of truth for P2P state — do not duplicate this logic in components

## Import rules
- Server files import types from `@mirage/shared-types`
- Web files import types from `@mirage/shared-types`, CRDT logic from `@mirage/crdt-logic`, UI primitives from `@mirage/ui`
- Never import from `packages/shared` (deleted — replaced by the above)

## Testing approach
- Unit tests with Vitest (`--run` flag, never watch mode)
- Integration tests hit a real MongoDB instance (use `docker compose up -d` first)
- No snapshot tests — prefer behavior assertions
