import { Router } from 'express';
import { coreStatus } from '../core.js';

export const health = Router();

health.get('/', (_req, res) => {
  res.json({ ok: true, t: Date.now() });
});

// Health Core dual-write status + actieve formuleversies (#127). Read-only,
// geen secrets — handig om vanaf het andere device te checken of de dual-write
// aanstaat en welke aggregatieformules gebruikt worden.
health.get('/core', (_req, res) => {
  res.json({ ok: true, core: coreStatus() });
});
