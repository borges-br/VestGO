# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci


FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

RUN mkdir -p .next/standalone/.next \
  && cp -R .next/static .next/standalone/.next/static \
  && if [ -d public ]; then cp -R public .next/standalone/public; fi


FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./

EXPOSE 3000

CMD ["node", "server.js"]