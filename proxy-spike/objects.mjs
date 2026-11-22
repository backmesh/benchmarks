// Small-object latency against the cache bucket, the access pattern of a Go
// build cache or Bazel's CAS: many small PUTs and GETs at once, and serial
// GETs. Writes to the own prefix under b/bench/<run>/. Spike code (row S1).
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const [chunk, out, count = '2000', size = '8192', width = '32'] = process.argv.slice(2);
const { openCache, openStore } = await import(chunk);
const opened = await openCache(process.env, 30000);
if (opened.state !== 'ready') throw new Error(`no cache: ${opened.reason}`);
const store = openStore(opened.tokens);
const { prefixes } = await opened.tokens();
const base = `${prefixes.own}b/bench/${process.env.GITHUB_RUN_ID}/`;
const n = Number(count), w = Number(width), body = randomBytes(Number(size));

async function pool(jobs, width) {
  const ms = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++], t = performance.now();
        await job();
        ms.push(performance.now() - t);
      }
    }),
  );
  return ms;
}
const stats = (ms, wall) => {
  const s = [...ms].sort((a, b) => a - b), q = (f) => +s[Math.floor(f * (s.length - 1))].toFixed(1);
  return { n: s.length, wallSeconds: +(wall / 1000).toFixed(2), perSecond: +(s.length / (wall / 1000)).toFixed(0), p50: q(0.5), p95: q(0.95), p99: q(0.99) };
};
const timed = async (f) => {
  const t = performance.now(), ms = await f();
  return stats(ms, performance.now() - t);
};
const keys = Array.from({ length: n }, (_, i) => `${base}${i}`);
const put = await timed(() => pool(keys.map((k) => () => store.put(k, new Blob([body]))), w));
const get = await timed(() => pool(keys.map((k) => async () => (await store.get(k)).arrayBuffer()), w));
const serial = await timed(() => pool(keys.slice(0, 200).map((k) => async () => (await store.get(k)).arrayBuffer()), 1));
const miss = await timed(() =>
  pool(Array.from({ length: 200 }, (_, i) => async () => store.get(`${base}missing-${i}`).catch(() => {})), 1),
);
const r = { count: n, size: Number(size), width: w, put, get, serialGet: serial, serialMiss: miss };
writeFileSync(out, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r));
