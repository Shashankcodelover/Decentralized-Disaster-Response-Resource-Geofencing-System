# ADR-002: Geofencing Strategy — MongoDB $geoIntersects + Server-Side State Cache

**Status:** Accepted  
**Date:** 2026-04-11

## Context

Geofence alerts must fire exactly once per enter/exit transition, not on every location update. Two approaches were considered:

1. **Client-side**: Browser computes point-in-polygon using Turf.js
2. **Server-side**: MongoDB `$geoIntersects` + in-memory transition cache

## Decision

Server-side with MongoDB `$geoIntersects`.

## Rationale

- Authoritative: all clients see the same alert regardless of their local state
- MongoDB 2dsphere handles complex polygons (concave, multi-ring) correctly
- In-memory `Map<responderId, Set<zoneId>>` tracks previous state for transition detection
- Client-side Turf.js would require syncing zone polygons to every client and recomputing on each GPS tick

## Consequences

- `geofenceService.ts` maintains a process-level cache — must be replaced with Redis when scaling to multiple API nodes (tracked in TASK-5.1)
- Offline clients cannot receive geofence alerts; P2P mode degrades gracefully to map-only
