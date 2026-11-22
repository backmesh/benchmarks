# Automatic Docker mode spike

backmesh cache phase 3, row DS: the automatic Docker mode measured as the
runner would run it, before any design. On AWS only (us-east-2): the installs
have no GCP or Azure runners, by the owner's choice of 2026-11-22.

[`docker-auto.yml`](../.github/workflows/docker-auto.yml) builds k6 v0.54.0,
`node-heavy` and `go-heavy` on `backmesh-4`, each in two arms:

- **cold**: a plain `docker build` on the VM's Docker, as every job runs
  today.
- **warm**: the same plain `docker build`, after steps standing in for the
  runner: they wait for the cache token (timed apart, since a built-in restore
  waits during job setup), restore the BuildKit state with
  `backmesh/cache/restore@v1`, unpack its pieces in parallel, start BuildKit on
  it with `default-load=true` and set `BUILDX_BUILDER` to it, which the runner
  would set in its environment for every job (`docker buildx use --default` is
  ignored by a plain `docker build`; see builder-probe). After
  the build they cap the state at 2 GB (`docker buildx prune
  --max-used-space`), pack it into about 16 pieces split by BuildKit snapshot
  directory, and save them with `backmesh/cache/save@v1`.

It checks that the plain `docker build` used the default builder (`builder`
in the result) and that the image is in the VM's Docker afterwards
(`loaded`), which a job's later `docker run` or `docker push` needs.

`total` is restore + unpack + BuildKit's start + build. `token`, `cap` and
`pack` are reported apart: the token wait overlaps job setup, and the cap and
pack would run after the job. A clear win is the warm arm's median `total` at
least 30% under the cold arm's. The first round only seeds the warm arm.
