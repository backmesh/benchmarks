# syntax=docker/dockerfile:1
# Representative Go/Rust-class compile-heavy image for the docker spike: a
# handful of real module dependencies (gin, cobra, zap, gorm+sqlite, which
# needs cgo) so a cold build pays module download, cgo toolchain work, and
# real package compilation, not just an empty `go build`.
#
# Fair by construction (docker README "Why a fair Go Dockerfile"): go.mod
# and the committed go.sum are copied and downloaded in their own layer,
# before the source is copied in, so a source-only change (what every warm
# round makes) never invalidates the dependency layer the way the previous
# version did (`COPY go.mod main.go ./` in one instruction). Both RUN
# instructions use BuildKit cache mounts for the module and build caches,
# the way a typical Go project's Dockerfile does.
FROM golang:1.23-bookworm
WORKDIR /app
ENV CGO_ENABLED=1
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod,id=go-heavy-mod \
    go mod download
COPY main.go ./
RUN --mount=type=cache,target=/go/pkg/mod,id=go-heavy-mod \
    --mount=type=cache,target=/root/.cache/go-build,id=go-heavy-build \
    go build -o /out/app .
CMD ["/out/app"]
