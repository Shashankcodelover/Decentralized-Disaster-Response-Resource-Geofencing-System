# Daily Improvement Log — 2026-08-01

## 🔍 Findings & Weaknesses Identified

1. **React Rules of Hooks Violation**: In `CommandHeader.tsx`, `useAppTheme()` was being invoked directly inside JSX attributes (`value={useAppTheme().userRole}`) and event handlers (`onChange={(e) => useAppTheme().changeRole(...)}`). This violates React's core Hook rules and causes state inconsistencies.
2. **Missing Error Boundary**: The application lacked a React Error Boundary. Any unhandled component error would cause the entire application to crash to a blank white screen, which is unacceptable for a mission-critical disaster response system.
3. **Unsafe P2P DataChannel Parsing**: In `@mirage/crdt-logic` (`useP2PSync.ts`), `JSON.parse` was executed on incoming RTCDataChannel messages without error handling, which could break WebRTC mesh synchronization if malformed packets arrived.
4. **Broken Monorepo Workspace**: `packages/shared` was an empty directory without a `package.json`, causing workspace initialization issues.
5. **Dead Component Files**: `AlertBanner.tsx` and `P2PStatus.tsx` were unused dead code files remaining in the web app.

---

## 🛠️ Changes Implemented Today

- **Fixed React Hooks Violation**: Updated `CommandHeader.tsx` to destructure `userRole` and `changeRole` at the top level of the component and reference those variables in the role selector.
- **Created Tactical Error Boundary**: Built a custom, dark-themed `ErrorBoundary.tsx` class component complete with warning diagnostics, action buttons, stack trace copy functionality, and pulse animations.
- **Protected Web App Shell**: Wrapped `<App />` with `<ErrorBoundary>` inside `apps/web/src/main.tsx`.
- **Hardened P2P CRDT Synchronization**: Wrapped `JSON.parse` in `useP2PSync.ts` with a `try-catch` block and warning logger.
- **Fixed `packages/shared` Monorepo Package**: Created `package.json` and `src/index.ts` for `@mirage/shared`.
- **Cleaned Up Dead Code**: Removed `AlertBanner.tsx` and `P2PStatus.tsx`.
- **Updated Documentation**: Refreshed `README.md` and `EXPLAINER.md` to reflect actual npm workspaces, package structure, and Error Boundary resilience.

---

## ⚠️ What Is Still Weak

- **Zero Test Coverage**: Vitest is configured, but there are no unit or integration tests for the API, CRDT logic, or UI components.
- **Hardcoded Secrets & URLs**: JWT fallback secrets and backend API URLs (`http://localhost:4000`) remain hardcoded across multiple frontend hooks and server files.
- **Monolithic Files**: `App.tsx` (800+ lines), `useTheme.ts` (600+ lines), and `GeospatialDashboard.tsx` (600+ lines) are large monolithic files that should be refactored into smaller, focused modules.

---

## 🎯 Next Session Priorities

1. **Add Unit & Integration Tests**: Write test suites for `@mirage/crdt-logic` and Express API endpoints using Vitest.
2. **Centralize Environment Configuration**: Create a unified API configuration module to eliminate hardcoded `http://localhost:4000` URLs.
3. **Refactor Monoliths**: Split translation dictionaries out of `useTheme.ts` into dedicated locale files.

---

# Daily Improvement Log — 2026-08-02

## 🔍 Findings & Weaknesses Identified

1. **Monolithic `useTheme.ts` Hook**: Contained 440+ lines of raw inline translation dictionaries, inflating the hook file to 623 lines and mixing localization state with theme computation logic.
2. **Duplicated Backend API URLs**: `http://localhost:4000` fallback string was duplicated across `useTheme.ts`, `useSocket.ts`, `App.tsx`, `ResourcePanel.tsx`, and `GeospatialDashboard.tsx`.
3. **Unnecessary Component Re-renders**: `useTheme.ts` recreated the `styles` object on every render without `useMemo`, causing all consuming components to re-render even when visual parameters were unchanged.

---

## 🛠️ Changes Implemented Today

- **Extracted i18n Locales Module**: Created `apps/web/src/i18n/locales.ts` containing `TRANSLATIONS`, `LANG_LIST`, and a standalone `translate()` helper function. Reduced `useTheme.ts` from 623 lines down to ~175 lines.
- **Centralized API Config**: Created `apps/web/src/config.ts` exporting `API_URL` read from `import.meta.env.VITE_API_URL ?? 'http://localhost:4000'`. Replaced all inline fallback strings across `useSocket.ts`, `App.tsx`, `ResourcePanel.tsx`, and `GeospatialDashboard.tsx`.
- **Performance Optimization**: Wrapped `styles` computation in `useMemo` and theme actions in `useCallback` inside `useTheme.ts` to prevent unnecessary component re-renders. Added `VITE_AUTH_SECRET` environment variable support for auto-authentication requests.

---

## ⚠️ What Is Still Weak

- **Zero Test Coverage**: Vitest is installed, but no unit tests exist for `crdt-logic`, API endpoints, or i18n translation helpers.
- **Large Component Files**: `App.tsx` (~800 lines) and `GeospatialDashboard.tsx` (~620 lines) remain large and handle multiple concerns.

---

## 🎯 Next Session Priorities

1. **Unit Tests for Core Logic**: Write Vitest unit tests for CRDT merge logic (`@mirage/crdt-logic`) and i18n translation fallbacks.
2. **API Route Tests**: Add integration tests for Express geofencing and resource endpoints using Vitest.
