# syntax=docker/dockerfile:1
# Alpine builder: much smaller pull than bookworm (~few hundred MB vs ~900MB+), fewer
# TLS stalls on flaky networks. Matches go.mod 1.25.x; GOTOOLCHAIN=local avoids extra
# toolchain downloads during build.
FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
COPY apps/backend .
# Prefer canonical ABIs from archive/packages/legacy/abi (overwrites apps/backend/internal/abis copies).
COPY archive/packages/legacy/abi/IMarketEngine.json archive/packages/legacy/abi/MarketEngineDispatcher.json internal/abis/
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/markets-api ./cmd/markets-api && \
    GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/markets-seed ./cmd/markets-seed && \
    GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /out/markets-api /markets-api
COPY --from=build /out/markets-seed /markets-seed
COPY --from=build /out/healthcheck /healthcheck
USER nonroot:nonroot
ENTRYPOINT ["/markets-api"]
