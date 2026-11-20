// Representative node-heavy image: a small Express app pulling in lodash and
// zod, compiled with tsc and bundled with webpack, so the cold build pays
// npm install, tsc, and a real webpack pass — not just an empty install.
import express from 'express';
import { z } from 'zod';
import { chunk } from 'lodash';

const Payload = z.object({ name: z.string() });

const app = express();
app.get('/health', (_req, res) => {
  const parsed = Payload.safeParse({ name: 'cache-phase1' });
  res.json({ ok: parsed.success, chunks: chunk([1, 2, 3, 4], 2) });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`listening on ${port}`));
