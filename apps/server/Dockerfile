FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* turbo.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter @mirage/api... 2>/dev/null || pnpm install --filter @mirage/api...

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules 2>/dev/null || true
COPY . .
RUN cd packages/shared-types && npx tsc 2>/dev/null || true
RUN cd apps/server && npx tsc

# --- Production ---
FROM node:20-alpine AS runner
RUN addgroup --system mirage && adduser --system --ingroup mirage api
WORKDIR /app

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps_node_modules 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=4000

USER api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
