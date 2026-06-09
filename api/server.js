import express from 'express';
import { health } from './routes/health.js';
import { sync } from './routes/sync.js';
import { photos } from './routes/photos.js';
import { voice } from './routes/voice.js';
import { products } from './routes/products.js';

const PORT = parseInt(process.env.PORT || '8089');

const ALLOWED_ORIGINS = new Set([
  // Primary path: app served over HTTPS via Tailscale Serve on the tailnet.
  'https://shred.tail9d0c71.ts.net',
  // LAN fallbacks (desktop tests over plain http; legacy self-signed name).
  'https://shred.frodo.local',
  'http://shred.frodo.local',
  'https://localhost',
  'http://frodo.local:8088',
  'http://localhost:8088'
]);
const ORIGIN_ALLOW_PATTERNS = [
  /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
  /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/
];

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));

// CORS — open to LAN origins, credentialed.
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && (ALLOWED_ORIGINS.has(origin) || ORIGIN_ALLOW_PATTERNS.some(p => p.test(origin)))) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// No application-level auth. The API is reachable only over the tailnet, where
// Tailscale's WireGuard transport + ACLs decide who can reach frodo at all.
// SECURITY: do NOT expose this host on the LAN/public internet or widen the
// tailnet ACL to untrusted devices — that exposes all data unauthenticated.
// See README. To re-enable a bearer layer, restore this middleware + the token
// plumbing in js/sync.js and the (commented) BEARER_TOKEN in .env.

app.use('/api/health', health);
app.use('/api/sync', sync);
app.use('/api/photos', photos);
app.use('/api/meals/voice', voice);
app.use('/api/products', products);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'internal error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[shred-api] listening on :${PORT}`);
});
