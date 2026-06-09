// Health Core dual-write test (#190). Draait volledig op WEGWERP-databases in
// een temp-dir — raakt /data/shred.db en de echte core.db NOOIT, omdat we
// DATA_DIR + CORE_DB zetten vóór we db.js/core.js importeren.
//
//   node api/test-core.mjs            (host, mits better-sqlite3 geïnstalleerd)
//   docker cp api/test-core.mjs shred-api:/app/ && \
//     docker exec shred-api node /app/test-core.mjs   (in de container)
//
// Exit 0 = alle asserts groen; exit 1 = falen.

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shred-core-test-'));
process.env.DATA_DIR = tmp;
process.env.CORE_DB = path.join(tmp, 'core.db');

const { db } = await import('./db.js');
const { dualWrite, coreStatus } = await import('./core.js');

const now = 1_700_000_000_000;          // vaste epoch (geen Date.now-afhankelijkheid)

// ── Seed shred.db (zoals na een sync-commit) ────────────────────────────────
db.prepare('INSERT OR REPLACE INTO meta (key, value, updated_at) VALUES (?,?,?)')
  .run('startDate', JSON.stringify('2026-01-01'), now);
db.prepare('INSERT OR REPLACE INTO products (id, value, updated_at) VALUES (?,?,?)')
  .run('p1', JSON.stringify({ kcalPer100g: 100, pPer100g: 10, cPer100g: 5, fPer100g: 2 }), now);
db.prepare('INSERT OR REPLACE INTO foods (day, value, updated_at) VALUES (?,?,?)')
  .run(5, JSON.stringify({ ontbijt: [{ productId: 'p1', grams: 200 }], lunch: [], snack: [], diner: [] }), now);
db.prepare('INSERT OR REPLACE INTO sets (ex_id, day, sets, updated_at) VALUES (?,?,?,?)')
  .run('bench', 5, JSON.stringify([{ w: 80, r: 8 }, { w: 80, r: 7 }]), now);
db.prepare('INSERT OR REPLACE INTO weights (day, kg, updated_at) VALUES (?,?,?)')
  .run(5, 84.2, now);

db.prepare('INSERT OR REPLACE INTO measurements (day, value, updated_at) VALUES (?,?,?)')
  .run(5, JSON.stringify({ waist: 88, hip: 96, arm: 35 }), now);

// ── Run de dual-write zoals de sync-route hem aanroept ──────────────────────
dualWrite([
  { type: 'weights', key: '5', value: 84.2, updatedAt: now },
  { type: 'foods', key: '5', updatedAt: now },
  { type: 'sets', key: 'bench:5', updatedAt: now },
  { type: 'measurements', key: '5', value: { waist: 88, hip: 96, arm: 35 }, updatedAt: now }
]);

// ── Assert: observations in core.db ─────────────────────────────────────────
const core = new Database(process.env.CORE_DB, { readonly: true });
const get = (metric) => core.prepare('SELECT value, unit, timestamp FROM observations WHERE metric_type = ?').get(metric);

const weight = get('body.weight');
assert.ok(weight, 'body.weight observatie ontbreekt');
assert.equal(weight.value, 84.2, 'body.weight value');
assert.equal(weight.timestamp, '2026-01-05', 'dag 5 → 2026-01-05');
assert.equal(weight.unit, 'kg');

assert.equal(get('nutrition.calories').value, 200, 'kcal = 100/100g × 200g');
assert.equal(get('nutrition.protein').value, 20, 'eiwit');
assert.equal(get('nutrition.carbs').value, 10, 'koolh.');
assert.equal(get('nutrition.fat').value, 4, 'vet');
assert.equal(get('fitness.session_volume').value, 1200, 'volume = 80×8 + 80×7');

// Metingen (#80-82): alleen ingevulde velden gespiegeld, in cm op dezelfde dag.
assert.equal(get('body.waist').value, 88, 'taille');
assert.equal(get('body.waist').unit, 'cm');
assert.equal(get('body.waist').timestamp, '2026-01-05');
assert.equal(get('body.hip').value, 96, 'heup');
assert.equal(get('body.arm').value, 35, 'arm');
assert.equal(get('body.chest'), undefined, 'borst niet ingevuld → geen observatie');

// ── Assert: idempotent (LWW). Zelfde records nog eens → geen duplicaten ──────
dualWrite([{ type: 'weights', key: '5', value: 84.2, updatedAt: now }]);
const weightCount = core.prepare("SELECT COUNT(*) c FROM observations WHERE metric_type='body.weight'").get().c;
assert.equal(weightCount, 1, 'geen duplicaat bij herhaalde write');

// ── Assert: best-effort — malformede input gooit niet en is no-op ───────────
assert.doesNotThrow(() => dualWrite([{ type: 'weights', key: 'geen-getal', value: NaN, updatedAt: 1 }]), 'dualWrite mag nooit throwen');
assert.doesNotThrow(() => dualWrite([]), 'lege batch');
assert.doesNotThrow(() => dualWrite([{ type: 'onbekend', key: 'x' }]), 'onbekend type genegeerd');

// ── Assert: status/formuleversies ───────────────────────────────────────────
const st = coreStatus();
assert.equal(st.enabled, true, 'core enabled');
assert.equal(st.formulas.nutrition, 'nutrition_day_v1');
assert.equal(st.formulas.session_volume, 'session_volume_day_v1');

core.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓ core dual-write test: alle asserts groen (incl. metingen)');
