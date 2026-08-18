# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS build
WORKDIR /src
RUN apk add --no-cache ca-certificates
ENV CGO_ENABLED=0 GOTOOLCHAIN=local
COPY apps/backend/go.mod apps/backend/go.sum ./
RUN go mod download
COPY apps/backend .
ARG SERVICE=markets-api
RUN GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/service ./cmd/${SERVICE}
RUN GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /out/service /service
COPY --from=build /out/healthcheck /healthcheck
USER nonroot:nonroot
ENTRYPOINT ["/service"]
