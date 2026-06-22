// Parity guard for the shared Shred <-> Health Core aggregate formulas.
//
// Health Core's canonical copy lives in:
//   health-core/scripts/lib/aggregate.mjs
//
// CI for this repository cannot import a sibling repository, so this test keeps
// a local canonical snapshot of the shared formulas and compares Shred's live
// helpers against representative edge cases. If either side intentionally
// changes a formula, update both repositories and this snapshot in the same
// change.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shred-aggregate-parity-'));
process.env.DATA_DIR = tmp;
delete process.env.CORE_DB;

const shred = await import('./core.js');

const canonical = {
  CATEGORY_KEYS: ['ontbijt', 'lunch', 'snack', 'diner'],
  round2: (x) => Math.round((Number(x) || 0) * 100) / 100,
  epochToIso(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n)) return null;
    return new Date(n).toISOString();
  },
  dayToDate(startDate, dayN) {
    const [y, m, d] = String(startDate).split('-').map(Number);
    const base = Date.UTC(y, m - 1, d);
    return new Date(base + (Number(dayN) - 1) * 86400000).toISOString().slice(0, 10);
  },
  nutritionTotals(foodsValue, getProduct) {
    const t = { kcal: 0, p: 0, c: 0, f: 0, itemCount: 0 };
    for (const cat of canonical.CATEGORY_KEYS) {
      for (const it of (foodsValue?.[cat] || [])) {
        t.itemCount++;
        const prod = getProduct(it.productId);
        if (!prod) continue;
        const factor = (Number(it.grams) || 0) / 100;
        t.kcal += (prod.kcalPer100g || 0) * factor;
        t.p += (prod.pPer100g || 0) * factor;
        t.c += (prod.cPer100g || 0) * factor;
        t.f += (prod.fPer100g || 0) * factor;
      }
    }
    return t;
  },
  setsVolume(setsArrays) {
    let vol = 0;
    for (const arr of setsArrays) {
      for (const s of (arr || [])) {
        const w = parseFloat(s.w) || 0;
        const r = parseInt(s.r, 10) || 0;
        vol += w * r;
      }
    }
    return vol;
  },
  extId: {
    weight: (day) => `weights:${day}`,
    foodsDay: (date) => `foods-day:${date}`,
    session: (date) => `session:${date}`
  },
  UNITS: {
    'body.weight': 'kg',
    'nutrition.calories': 'kcal',
    'nutrition.protein': 'g',
    'nutrition.carbs': 'g',
    'nutrition.fat': 'g',
    'fitness.session_volume': 'kg'
  },
  DERIVED: {
    nutrition: { derived_from: 'shred.foods', aggregation_window: 'day', formula_version: 'nutrition_day_v1' },
    volume: { derived_from: 'shred.sets', aggregation_window: 'day', formula_version: 'session_volume_day_v1' }
  }
};

const products = new Map([
  ['oats', { kcalPer100g: 372, pPer100g: 13.5, cPer100g: 58.7, fPer100g: 7 }],
  ['whey', { kcalPer100g: 401, pPer100g: 77.2, cPer100g: 6.4, fPer100g: 5.8 }],
  ['partial', { kcalPer100g: 50, pPer100g: null, cPer100g: undefined, fPer100g: 1.2 }]
]);
const getProduct = (id) => products.get(id) || null;

const foodsDay = {
  ontbijt: [
    { productId: 'oats', grams: 80 },
    { productId: 'whey', grams: '33.5' },
    { productId: 'missing', grams: 120 }
  ],
  lunch: [{ productId: 'partial', grams: 250 }],
  snack: [{ productId: 'oats', grams: '' }],
  diner: [{ productId: 'whey', grams: -10 }]
};
const sets = [
  [{ w: '80', r: '8' }, { w: 85.5, r: '5' }, { w: '', r: 12 }],
  null,
  [{ w: 'bodyweight', r: '10' }, { w: 60, r: 'bad' }],
  [{ w: -10, r: 3 }]
];

assert.deepEqual(shred.CATEGORY_KEYS, canonical.CATEGORY_KEYS, 'meal-category order matches Health Core');
assert.deepEqual(shred.nutritionTotals(foodsDay, getProduct), canonical.nutritionTotals(foodsDay, getProduct), 'nutrition totals match Health Core snapshot');
assert.equal(shred.setsVolume(sets), canonical.setsVolume(sets), 'session volume matches Health Core snapshot');
assert.equal(shred.dayToDate('2026-01-01', 60), canonical.dayToDate('2026-01-01', 60), 'day -> date conversion matches');
assert.equal(shred.dayToDate('2026-03-29', 2), canonical.dayToDate('2026-03-29', 2), 'UTC day math avoids DST drift');
assert.equal(shred.epochToIso(1_700_000_000_000), canonical.epochToIso(1_700_000_000_000), 'epoch -> ISO conversion matches');
assert.equal(shred.epochToIso('not-a-number'), canonical.epochToIso('not-a-number'), 'invalid epoch handling matches');

for (const value of [0, 1.234, '5.678', NaN, null, undefined]) {
  assert.equal(shred.round2(value), canonical.round2(value), `round2 parity for ${String(value)}`);
}

assert.equal(shred.extId.weight(7), canonical.extId.weight(7), 'weight external_id parity');
assert.equal(shred.extId.foodsDay('2026-02-01'), canonical.extId.foodsDay('2026-02-01'), 'foods external_id parity');
assert.equal(shred.extId.session('2026-02-01'), canonical.extId.session('2026-02-01'), 'session external_id parity');

for (const [metric, unit] of Object.entries(canonical.UNITS)) {
  assert.equal(shred.UNITS[metric], unit, `${metric} unit parity`);
}
assert.deepEqual(shred.DERIVED.nutrition, canonical.DERIVED.nutrition, 'nutrition metadata parity');
assert.deepEqual(shred.DERIVED.volume, canonical.DERIVED.volume, 'volume metadata parity');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓ aggregate parity test: Shred formulas match Health Core snapshot');
