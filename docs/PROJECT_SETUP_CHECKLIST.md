# ✅ PROJECT SETUP CHECKLIST

Follow this checklist to get the Decentralized Disaster Response System running locally.

## Prerequisites
- [ ] Node.js (v18+)
- [ ] MongoDB (Local instance or MongoDB Atlas URI)
- [ ] Redis (Required for Socket.io adapter / Rate Limiting)
- [ ] pnpm or npm

## 1. Environment Variables
- [ ] Copy `.env.example` to `.env` in `apps/server/`
- [ ] Generate a secure `JWT_SECRET`
- [ ] Generate a secure `COMPLIANCE_SIGNING_KEY`
- [ ] Set `MONGO_URI` to your running database instance
- [ ] Set `REDIS_URL` to your running Redis instance

## 2. Installation
- [ ] Run `npm install` from the monorepo root to install dependencies across all workspaces (`server`, `crdt-logic`, `shared`, `shared-types`).

## 3. Build Shared Packages
- [ ] Run `npm run build -w packages/shared`
- [ ] Run `npm run build -w packages/shared-types`
- [ ] Run `npm run build -w packages/crdt-logic`

## 4. Run the Server
- [ ] Navigate to `apps/server`
- [ ] Run `npm run build`
- [ ] Run `npm start` (or `npm run dev` for hot-reloading)

## 5. Verification
- [ ] Check `/health` endpoint to ensure MongoDB is connected and the API is up.
- [ ] Check `/ready` endpoint.
- [ ] Run the test suite: `npm test` inside `apps/server/`.
