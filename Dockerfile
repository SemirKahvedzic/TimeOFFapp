# syntax=docker.io/docker/dockerfile:1
# Multi-stage Dockerfile for Next.js 16 (App Router, standalone output) + Prisma 7 + Postgres.

FROM node:20-alpine AS base

# ──────────────────────────────────────────────────────────────────
# 1. Install dependencies (cached unless package*.json or schema change).
#    The schema is copied in too because `postinstall` runs `prisma generate`.
# ──────────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ──────────────────────────────────────────────────────────────────
# 2. Build the app. `next build` consumes the generated Prisma client
#    that's already in node_modules from the deps stage.
# ──────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ──────────────────────────────────────────────────────────────────
# 3. Runner. Ships only the standalone server, static assets, public/,
#    and the Prisma CLI + generated client (so `prisma migrate deploy`
#    can run as Fly's release_command before traffic shifts).
# ──────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

# Prisma's schema engine (used by `migrate deploy` / `db push`) is a native
# binary linked against libssl + libc. Without these the engine fails to
# load before it can print a useful error message.
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma bits needed at runtime / for release_command.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
