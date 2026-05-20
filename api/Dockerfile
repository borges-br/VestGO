# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci


FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build


FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["npm", "run", "start"]