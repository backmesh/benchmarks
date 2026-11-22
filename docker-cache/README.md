# Docker cache benchmark

Whether keeping a BuildKit builder's whole state between runs makes Docker
builds on backmesh runners faster. Tracked in backmesh cache phase 3, row B0.

backmesh's phase 1 spike exported BuildKit's cache (`--cache-to type=local`)
and pruned the engine before each warm round. An exported cache never holds
`RUN --mount=type=cache` contents, and the prune dropped the base images, so
its warm builds redid the module download and the full compile. This
benchmark keeps the builder's state directory instead, as a persistent
builder would.

[`docker-cache.yml`](../.github/workflows/docker-cache.yml) builds three
images on `backmesh-4`, each in two arms:

- **cold**: a new BuildKit container with an empty state directory.
- **warm**: the state directory from the previous round, restored with
  `backmesh/cache/restore@v1`, unpacked with `sudo tar` (it's root's), then
  packed and saved again with `backmesh/cache/save@v1` after the build.

Images: [grafana/k6](https://github.com/grafana/k6) v0.54.0's Dockerfile as
it is, and the phase 1 spike's `node-heavy` and `go-heavy`, whose dependency
layers are separate from the source and whose Go build uses cache mounts.
Each round appends a comment to one source file, so every round rebuilds
from the source layer on.

A push to the `docker-cache` branch is one round. The first round only seeds
the warm arm. Each job's `result.json` artifact and step summary hold its
times in seconds: `token` (the warm arm's wait for its cache token, not in `total`), `restore`, `unpack`, `builder` (BuildKit's start), `build`
and their sum, `total`; `pack` is the warm arm's packing after the build,
which isn't in `total` because the upload runs after the job.

A clear win is the warm arm's median `total` at least 30% under the cold
arm's, the bar the phase 1 spike used.
