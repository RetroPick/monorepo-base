# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-fe-v1 \
    pnpm install --frozen-lockfile --filter web... --store-dir=/pnpm/store

COPY apps/web apps/web
COPY packages/contracts packages/contracts
COPY packages/legacy/abi packages/legacy/abi
COPY archive/legacy/dot-docs-production archive/legacy/dot-docs-production

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_REOWN_PROJECT_ID=d2f5d76bb1b000f9443e2172d3a560ba
ENV NEXT_PUBLIC_REOWN_PROJECT_ID=$NEXT_PUBLIC_REOWN_PROJECT_ID

RUN --mount=type=cache,target=/pnpm/store,id=pnpm-fe-v1 \
    --mount=type=cache,target=/app/apps/web/.next/cache,id=next-fe-v1 \
    pnpm --filter web build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
