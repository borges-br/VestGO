# ─── VestGO Web — Dockerfile (Next.js 14 App Router) ─────────────────────────
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY web/package*.json ./

FROM base AS deps
RUN npm ci --only=production

FROM base AS builder
COPY web/package*.json ./
COPY web/ ./
RUN npm ci
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]