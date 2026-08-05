FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN cd packages/shared-types && npx tsc 2>/dev/null || true
RUN cd apps/server && npx tsc

FROM node:20-alpine AS runner
RUN addgroup --system mirage && adduser --system --ingroup mirage api
WORKDIR /app

COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=4000

USER api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
