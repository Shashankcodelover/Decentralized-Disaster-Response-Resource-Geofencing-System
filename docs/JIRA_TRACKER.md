# Jira Tracker: Decentralized Disaster Response Geofencing

## 📌 Project Aim & Modern World Relevance
During catastrophic events (hurricanes, floods, earthquakes), communications networks go down. First responders must coordinate local resources, identify geofenced hazard zones, and synchronize search and rescue locations without central cloud databases.

---

## 🔍 Identified Loopholes & Missing Features (Current State)
* **No Offline Geofencing Math**: The server registers geofence metadata but doesn't calculate locally whether a responder's coordinates lie inside a hazard zone polygon.
* **Basic CRUD Operations**: Simple database storage of coordinates without geographic analysis engines.

---

## 🛠️ V20 Upgrade Action Checklist

- [x] **Task 1**: Create `local_geofencer.ts` inside `apps/server/src/services/` implementing a Point-in-Polygon (Ray-Casting) algorithm for real-time offline-capable geofence alerts.
- [x] **Task 2**: Implement simulated coordination logging for responders entering/exiting geofenced hazard zones.
- [x] **Task 3**: Verify compile correctness and execution flow.

---

## 🚦 Status Summary
- **Overall Status**: Completed ✅
- **Completed**: Task 1, Task 2, Task 3
- **Pending**: None

---

## 🔮 Next-Level Upgrades (Upcoming Ideas for V21)
- [x] **Task 4**: Create a peer-to-peer Wi-Fi network routing service mapping dynamic local responders topology lists.
- [x] **Task 5**: Build an interactive evacuation-route planner that routes around dynamically identified high-risk polygons.
- [x] **Task 6**: Implement a priority queue triage solver sorting rescue requests based on medical severity and resource availability.
- [x] **Task 7**: Add proximity-based geofence warning alerts.
- [x] **Task 8**: Add system incident log compilation metrics.

---

## 🚦 Status Summary
- **Overall Status**: Completed ✅
- **Completed**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8
- **Pending**: None
