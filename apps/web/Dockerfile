# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
COPY apps/web/package.json apps/web/package.json
COPY packages/polymarket/package.json packages/polymarket/package.json
COPY packages/config/tsconfig/package.json packages/config/tsconfig/package.json

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-markets-web \
    pnpm install --frozen-lockfile --filter @retropick/markets-web... --store-dir=/pnpm/store

COPY apps/web apps/web
COPY packages/polymarket packages/polymarket
COPY packages/config/tsconfig packages/config/tsconfig
COPY schemas/openapi/markets-v1.yaml schemas/openapi/markets-v1.yaml

ARG NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

ARG NEXT_PUBLIC_PRODUCT=markets
ENV NEXT_PUBLIC_PRODUCT=$NEXT_PUBLIC_PRODUCT

ARG NEXT_PUBLIC_REOWN_PROJECT_ID=d2f5d76bb1b000f9443e2172d3a560ba
ENV NEXT_PUBLIC_REOWN_PROJECT_ID=$NEXT_PUBLIC_REOWN_PROJECT_ID

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-markets-web \
    --mount=type=cache,target=/app/apps/web/.next/cache,id=next-markets-web \
    pnpm --filter @retropick/markets-web build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001

CMD ["node", "apps/web/server.js"]
