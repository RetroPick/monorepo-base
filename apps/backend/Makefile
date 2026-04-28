# Go 1.24+ stamps binaries with VCS metadata; bind mounts / shallow clones often make `git` fail with exit 128.
# Use this Makefile (or pass -buildvcs=false) for reproducible builds in CI and Docker.
export GOFLAGS := -buildvcs=false

.PHONY: build test
build:
	go build -o /dev/null ./...

test:
	go test ./...
