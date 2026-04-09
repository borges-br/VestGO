# ─── VestGO API — Dockerfile (Fastify + Prisma) ──────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

COPY api/package*.json ./

FROM base AS deps
RUN npm ci

FROM base AS builder
COPY api/ ./
COPY --from=deps /app/node_modules ./node_modules
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production
RUN npx prisma generate

USER fastify

EXPOSE 3001

# Migrações + start (executa automaticamente no container)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]