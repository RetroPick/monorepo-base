FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/fe-v1/package.json apps/fe-v1/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/types/package.json packages/types/package.json

RUN pnpm install --frozen-lockfile

COPY apps/fe-v1 apps/fe-v1
COPY packages/contracts packages/contracts
COPY packages/types packages/types
COPY package/abi package/abi

ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter fe-v1 build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/fe-v1/.next/standalone ./
COPY --from=builder /app/apps/fe-v1/.next/static ./apps/fe-v1/.next/static
COPY --from=builder /app/apps/fe-v1/public ./apps/fe-v1/public

EXPOSE 3000

CMD ["node", "apps/fe-v1/server.js"]
