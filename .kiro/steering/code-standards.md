---
inclusion: always
---

# Code Standards — Project Mirage

## TypeScript
- Strict mode enabled in all `tsconfig.json` files
- No `any` — use `unknown` and narrow with type guards
- Prefer `interface` over `type` for object shapes; use `type` for unions/intersections
- All async functions must handle errors (try/catch or `.catch()`)

## React
- Functional components only — no class components
- Custom hooks live in `apps/web/src/hooks/` or `packages/crdt-logic/src/`
- Shared UI primitives go in `packages/ui/src/` — not in `apps/web/src/components/`
- Use `framer-motion` for all enter/exit animations — no raw CSS transitions for interactive elements

## API / Express
- All route handlers must be wrapped in try/catch and return typed error responses
- Use `res.status(N).json({ error: '...' })` — never `res.send()` for errors
- Mongoose queries use `.lean()` for read-only responses to avoid hydration overhead
- Soft-delete zones with `{ active: false }` — never hard-delete geospatial data

## Naming
- Files: `camelCase.ts` for utilities, `PascalCase.tsx` for React components
- Socket events: always use `SOCKET_EVENTS` constants from `@mirage/shared-types`
- MongoDB models: `PascalCase` (e.g., `DangerZoneModel`)
- React hooks: `use` prefix (e.g., `useP2PSync`)

## Git
- Commit messages: `type(scope): description` — e.g., `feat(geofence): add exit alert debounce`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
