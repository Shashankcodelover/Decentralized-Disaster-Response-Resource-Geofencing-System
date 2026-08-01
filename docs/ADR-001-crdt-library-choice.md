# ADR-001: CRDT Library Choice — Yjs over Automerge

**Status:** Accepted  
**Date:** 2026-04-11

## Context

Project Mirage requires conflict-free state sync for resource data across an offline P2P mesh. Two mature CRDT libraries were evaluated: **Yjs** and **Automerge v2**.

## Decision

We chose **Yjs**.

## Rationale

| Criterion | Yjs | Automerge v2 |
|---|---|---|
| Bundle size | ~30KB | ~120KB |
| WebRTC integration | `y-webrtc` provider available | Manual wiring required |
| Update encoding | Binary (compact) | Binary (CBOR) |
| React hooks ecosystem | Mature (`y-react`) | Minimal |
| Awareness (cursors/presence) | Built-in | Not supported |

Yjs's binary update format is critical for low-bandwidth disaster environments. The `y-webrtc` provider also gives us a ready-made DataChannel sync layer that we can extend.

## Consequences

- CRDT logic lives in `packages/crdt-logic` and depends on `yjs`
- Server acts as a relay only — it never interprets CRDT state
- Automerge remains a viable future migration if richer JSON-patch semantics are needed
