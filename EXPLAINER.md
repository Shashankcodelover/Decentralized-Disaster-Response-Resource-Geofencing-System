# EXPLAINER: Project Mirage (Decentralized Disaster Response & Geofencing System)

## 1. Project Overview & "In and Out" (ELI15/20)
**Project Mirage** is an emergency coordination platform designed to function during natural disasters (like floods or earthquakes) when centralized cell towers and power grids are knocked out.
- **In**: Responders report their GPS positions and active inventory levels (e.g. food boxes, water cases) via their phone dashboards.
- **Processing**:
  1. **Online Mode**: Express and Socket.io track responder coordinates, running database checks in MongoDB using `2dsphere` indexes to see if responder locations intersect with drawn "Danger Zones" (floods, fire lines).
  2. **Offline Mode**: If internet drops, responders' devices automatically establish a direct **P2P WebRTC local mesh network** over local Wi-Fi.
  3. **Data Consistency**: Responders edit resource counts offline. Updates are merged using **Yjs CRDTs** (Conflict-Free Replicated Data Types) which ensures that once connection returns, all records sync without database merge conflicts.
- **Out**: Real-time Leaflet map grids rendering responder markers, danger polygons, and audio alerts when entering warning zones.

---

## 2. Tech Stack & Decision Analysis (Why this, not that?)

| Component | Technology | Why we chose it | Why NOT the alternatives? |
| :--- | :--- | :--- | :--- |
| **Workspace Manager**| **Turborepo & pnpm**| Manages a TypeScript monorepo (`apps/api`, `apps/web`, `packages/shared`) with shared compile pipelines, fast caching, and absolute package separation. | **Lerna / Yarn workspaces**: Turborepo utilizes remote caching and incremental builds, which is 10x faster. |
| **P2P Syncer** | **Yjs CRDTs** | Merges concurrent text/number edits using commutative mathematical logic (Yata algorithm). Guarantees everyone sees the exact same data eventual state. | **Operational Transformation (OT)**: Requires a centralized server (like Google Docs) to act as the single source of truth; impossible in offline mesh modes. |
| **Geospatial Engine**| **MongoDB 2dsphere** | Native point-in-polygon queries (`$geoIntersects`) make it trivial to compute whether a coordinate is inside a hazard zone. | **PostGIS (Postgres)**: More difficult to scale and parse unstructured sensor logs compared to JSON document databases like Mongo. |
| **Sandbox Execution**| **Node v22 permissions**| Restricts the API process filesystem read/write access and network boundaries directly at the CLI run command level. | **Docker Only**: Docker isolates containers, but Node 22 permission flags block file leakage even if a package inside the node app is compromised. |

---

## 3. 10x Upgrade Blueprint (Developing to Version 8.0 - 10.0)

To transition Project Mirage into a production-ready tactical emergency response system:

### A. Core Upgrades
1. **Dynamic Mesh Routing protocols (BATMAN/OLSR)**: Compile native peer-to-peer mesh packet-forwarding nodes into the client browser so coordinates can hop multi-node across responder phones.
2. **Offline Leaflet Map Tile Caching**: Implement Service Workers that cache Mapbox/OpenStreetMap raster tiles into browser IndexedDB storage during active online operations.
3. **Hardware Integration (LoRaWAN)**: Provide backup serial port connection drivers to let responder phones broadcast short status packets over LoRa radio transmitters when Wi-Fi is also down.

### B. Upgraded Code structure & Backend Logic
Here is the upgraded Express geofence check controller featuring geospatial MongoDB queries:

```javascript
// Decentralized-Disaster-Response-Resource-Geofencing-System/apps/api/controllers/geofence.js
const { MongoClient } = require('mongodb');

class GeofenceQueryService {
  constructor(mongoUri) {
    this.client = new MongoClient(mongoUri);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('mirage_emergency');
  }

  async verifyResponderLocation(responderId, lat, lng) {
    if (!this.db) await this.connect();

    // 1. Query danger zones for point intersection
    const activeDangerZones = await this.db.collection('danger_zones').find({
      active: true,
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // GeoJSON is [longitude, latitude]
          }
        }
      }
    }).toArray();

    if (activeDangerZones.length > 0) {
      // 2. Log incident and return warnings
      await this.db.collection('geofence_incidents').insertOne({
        responderId,
        location: { type: "Point", coordinates: [lng, lat] },
        matchedZones: activeDangerZones.map(z => z._id),
        timestamp: new Date()
      });

      return {
        insideDangerZone: true,
        zones: activeDangerZones.map(z => ({ name: z.name, severity: z.severity }))
      };
    }

    return { insideDangerZone: false, zones: [] };
  }
}

module.exports = GeofenceQueryService;
```
