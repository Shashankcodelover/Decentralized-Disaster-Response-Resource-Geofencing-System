# ADR-003: Monorepo Tooling — Turborepo over Nx

**Status:** Accepted  
**Date:** 2026-04-11

## Context

The project requires a monorepo that supports incremental builds, shared packages, and parallel task execution.

## Decision

**Turborepo** with npm workspaces.

## Rationale

- Zero-config caching with `turbo.json` pipeline
- Lighter than Nx for a 2-app, 3-package repo (no generators/plugins needed yet)
- Native npm workspaces — no additional package manager lock-in
- Remote caching available via Vercel if needed later

## Consequences

- `turbo.json` defines the `build → test` dependency chain
- Each package declares its own `tsconfig.json`; root has no TypeScript config
- Nx migration is straightforward if the project grows to 10+ packages
