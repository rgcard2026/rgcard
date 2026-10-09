FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV RG_CARD_DATA_DIR=/data
ENV RG_CARD_DB_PATH=/data/rg-card.db
ENV RG_CARD_UPLOADS_PATH=/data/uploads
ENV DATABASE_URL=file:/data/rg-card.db

COPY --from=builder /app/public ./public
# Kept for legacy bundled files; it may remain empty.
RUN mkdir -p ./seed-uploads
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/railway-start.sh ./scripts/railway-start.sh
RUN chmod +x ./scripts/railway-start.sh

EXPOSE 3000
CMD ["./scripts/railway-start.sh"]
