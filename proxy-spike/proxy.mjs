// A Turborepo remote cache on the runner, backed by backmesh's cache bucket
// through backmesh/cache's own store client and the job's token. Reads own,
// then base, then default; writes own. Spike code (cache phase 3, row S1):
// it logs each request's time to $RESULTS/requests.jsonl.
import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';

const [chunk, port = '4000'] = process.argv.slice(2);
const { openCache, openStore } = await import(chunk);
const opened = await openCache(process.env, 30000);
if (opened.state !== 'ready') throw new Error(`no cache: ${opened.reason}`);
const store = openStore(opened.tokens);
const { prefixes } = await opened.tokens();
const reads = [prefixes.own, prefixes.base, prefixes.default].filter(Boolean);
const log = (r) =>
  appendFileSync(`${process.env.RESULTS}/requests.jsonl`, JSON.stringify(r) + '\n');

const missing = (e) => / 404 /.test(String(e));
async function find(hash) {
  for (const p of reads) {
    try {
      return await store.get(`${p}b/turbo/${hash}`);
    } catch (e) {
      if (!missing(e)) throw e;
    }
  }
}

createServer(async (req, res) => {
  const t = performance.now();
  const url = new URL(req.url, 'http://x');
  const hash = /^\/v8\/artifacts\/([0-9a-f]+)$/.exec(url.pathname)?.[1];
  let status = 404, bytes = 0;
  try {
    if (hash && (req.method === 'GET' || req.method === 'HEAD')) {
      const found = await find(hash);
      if (found) {
        status = 200;
        const body = Buffer.from(await found.arrayBuffer());
        bytes = body.length;
        res.writeHead(200, { 'content-length': body.length });
        res.end(req.method === 'GET' ? body : undefined);
      }
    } else if (hash && req.method === 'PUT') {
      const parts = [];
      for await (const c of req) parts.push(c);
      const body = Buffer.concat(parts);
      bytes = body.length;
      await store.put(`${prefixes.own}b/turbo/${hash}`, new Blob([body]));
      status = 202;
      res.writeHead(202, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ urls: [] }));
    } else if (url.pathname === '/v8/artifacts/status') {
      status = 200;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'enabled' }));
    } else if (req.method === 'POST') {
      for await (const _ of req);
      status = 200;
      res.writeHead(200).end();
    }
  } catch (e) {
    status = 500;
    console.error(e);
  }
  if (!res.headersSent) res.writeHead(status).end();
  log({ method: req.method, path: url.pathname, status, bytes, ms: +(performance.now() - t).toFixed(1) });
}).listen(Number(port), '127.0.0.1', () => console.log(`proxy on ${port}, reads ${reads.length} prefixes`));
