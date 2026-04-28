# syntax=docker/dockerfile:1
# Alpine builder: much smaller pull than bookworm (~few hundred MB vs ~900MB+), fewer
# TLS stalls on flaky networks. Matches go.mod 1.24.x; GOTOOLCHAIN=local avoids extra
# toolchain downloads during build.
FROM golang:1.24-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download
COPY apps/backend .
# Prefer canonical ABIs from package/abi (overwrites apps/backend/internal/abis copies).
COPY package/abi/IMarketEngine.json package/abi/MarketEngineDispatcher.json internal/abis/
ARG SERVICE=api
RUN GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/service ./cmd/${SERVICE}
RUN GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /out/service /service
COPY --from=build /out/healthcheck /healthcheck
USER nonroot:nonroot
ENTRYPOINT ["/service"]
