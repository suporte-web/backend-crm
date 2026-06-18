FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci
RUN DATABASE_URL="postgresql://crm:crm_password@db:5432/crm_portal?schema=public" npx prisma generate

FROM deps AS build

COPY nest-cli.json tsconfig*.json ./
COPY src ./src

RUN npm run build

FROM node:24-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
ENV FRONTEND_URL=http://52.193.143.187:3000
ENV CORS_ORIGIN=http://52.193.143.187,http://52.193.143.187:3000

COPY package*.json prisma.config.ts ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

RUN mkdir -p uploads/portal-content uploads/lead-imports uploads/propostas

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
