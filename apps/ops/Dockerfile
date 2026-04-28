# syntax=docker/dockerfile:1
# Use --frozen-lockfile + --filter ops... so pnpm skips the heavy "resolve" step against
# the registry (that is what makes installs look stuck at resolved 440+ / huge downloads).
# Avoid BuildKit-only RUN --mount so plain `docker build` works in local testing.
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/contracts packages/contracts
COPY packages/types packages/types
COPY apps/ops apps/ops
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm install --frozen-lockfile --filter ops... --store-dir=/pnpm/store
RUN node -e "const fs=require('fs'); for (const name of ['react','react-dom']) { const src=fs.realpathSync('/app/apps/ops/node_modules/@types/'+name); const dest='/app/node_modules/@types/'+name; fs.rmSync(dest,{force:true,recursive:true}); fs.symlinkSync(src,dest,'dir'); }"
RUN pnpm --filter ops build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/ops ./apps/ops
EXPOSE 3001
ENV HOSTNAME=0.0.0.0
CMD ["pnpm", "--filter", "ops", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3001"]
