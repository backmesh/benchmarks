# Build-cache proxy spike

backmesh cache phase 3, row S1: can a proxy on the runner serve a build
tool's remote cache from backmesh's cache bucket fast enough, before the
design settles the layout? On AWS only (us-east-2): the installs have no GCP
or Azure runners, by the owner's choice of 2026-11-22.

[`proxy-spike.yml`](../.github/workflows/proxy-spike.yml) runs two jobs on
`backmesh-4`:

- **turbo**: Turborepo v2.11.13's `examples/basic` (two Next.js apps and
  shared packages), `turbo run build lint check-types`, in two arms:
  - **local**: no remote cache, as every run is today on a fresh VM.
  - **remote**: [`proxy.mjs`](proxy.mjs) on `127.0.0.1:4000` answers
    Turborepo's `/v8/artifacts/<hash>` API from the bucket, reading the own,
    base and default prefixes and writing own, under `b/turbo/`. It uses
    `backmesh/cache`'s own store client and the job's token, and logs each
    request's time.
- **objects**: [`objects.mjs`](objects.mjs) puts 2,000 objects of 8 KiB, 32
  at a time, gets them back the same way, then times 200 serial GETs and 200
  serial misses: the many-small-objects pattern of Go's build cache or
  Bazel's CAS.

A push to `proxy-spike` is one round. The first round's remote arm misses and
uploads; each later round's remote arm restores the previous round's tasks.
Each job's `result.json` artifact and step summary hold the times: the turbo
run's seconds and task cache status, and the proxy's GET hit, GET miss and
PUT latencies (ms).
