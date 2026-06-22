// ────────────────────────────────────────────────────────────────────────────
// Health Core dual-write (Fase A).
//
// Additive, BEST-EFFORT mirror of accepted sync records into the Health Core
// observations time-series (core.db). It NEVER touches shred.db and NEVER throws
// into the sync response: every core write is wrapped so a failure here is
// logged and ignored — the proven shred.db path stays primary.
//
// Disabled automatically (no-op) when CORE_DB is unset or core.db can't be
// opened/initialised, so the app runs unchanged if the core is absent.
//
// The aggregation formulas below are a deliberate copy of
// health-core/scripts/lib/aggregate.mjs (the canonical source). They cannot be
// imported — this api image only builds its own ./api dir — so the two MUST be
// kept in sync. Identical formulas guarantee backfill and live-write collide on
// the same UNIQUE(source, external_id, metric_type) key (LWW upsert, no dupes).
// ────────────────────────────────────────────────────────────────────────────
import Database from 'better-sqlite3';
import { db } from './db.js';   // shred.db connection — read-only use here

// ── Canonical aggregation logic (mirror of scripts/lib/aggregate.mjs) ────────
export const CATEGORY_KEYS = ['ontbijt', 'lunch', 'snack', 'diner'];
export const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
export const epochToIso = (ms) => { const n = Number(ms); return Number.isFinite(n) ? new Date(n).toISOString() : null; };

export function dayToDate(startDate, dayN) {
  const [y, m, d] = String(startDate).split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  return new Date(base + (Number(dayN) - 1) * 86400000).toISOString().slice(0, 10);
}
export function nutritionTotals(foodsValue, getProduct) {
  const t = { kcal: 0, p: 0, c: 0, f: 0, itemCount: 0 };
  for (const cat of CATEGORY_KEYS) {
    for (const it of (foodsValue?.[cat] || [])) {
      t.itemCount++;
      const prod = getProduct(it.productId);
      if (!prod) continue;
      const factor = (Number(it.grams) || 0) / 100;
      t.kcal += (prod.kcalPer100g || 0) * factor;
      t.p    += (prod.pPer100g    || 0) * factor;
      t.c    += (prod.cPer100g    || 0) * factor;
      t.f    += (prod.fPer100g    || 0) * factor;
    }
  }
  return t;
}
export function setsVolume(setsArrays) {
  let vol = 0;
  for (const arr of setsArrays) for (const s of (arr || [])) {
    vol += (parseFloat(s.w) || 0) * (parseInt(s.r, 10) || 0);
  }
  return vol;
}
export const extId = {
  weight: (day) => `weights:${day}`,
  foodsDay: (date) => `foods-day:${date}`,
  session: (date) => `session:${date}`,
  measurement: (date, field) => `measurements:${date}:${field}`,
  cardio: (date) => `cardio:${date}`
};
export const UNITS = {
  'body.weight': 'kg', 'nutrition.calories': 'kcal', 'nutrition.protein': 'g',
  'nutrition.carbs': 'g', 'nutrition.fat': 'g', 'fitness.session_volume': 'kg',
  'body.waist': 'cm', 'body.hip': 'cm', 'body.chest': 'cm', 'body.arm': 'cm', 'body.thigh': 'cm',
  'fitness.cardio_minutes': 'min'
};
// Veld in een measurements-record → Health Core metric_type. Ruwe waarden (geen
// aggregatie), daarom geen formula_version nodig — net als body.weight.
const MEASURE_METRICS = [
  ['waist', 'body.waist'], ['hip', 'body.hip'], ['chest', 'body.chest'],
  ['arm', 'body.arm'], ['thigh', 'body.thigh']
];
export const DERIVED = {
  nutrition: { derived_from: 'shred.foods', aggregation_window: 'day', formula_version: 'nutrition_day_v1' },
  volume:    { derived_from: 'shred.sets',  aggregation_window: 'day', formula_version: 'session_volume_day_v1' }
};
const LIVE = { source_path: 'live' };   // provenance tag for live-written rows

// ── Core connection + schema/seed (idempotent, self-healing) ─────────────────
let core = null;          // better-sqlite3 handle or null when disabled
let upsertStmt = null;
let shredSourceId = null;

function initCore() {
  const path = process.env.CORE_DB;
  if (!path) { console.log('[core] CORE_DB unset — dual-write disabled'); return; }
  try {
    const c = new Database(path);
    c.pragma('journal_mode = WAL');
    c.pragma('synchronous = NORMAL');
    c.pragma('foreign_keys = ON');
    // Ensure the tables + vocabulary we write exist (matches the canonical
    // schema/seed; additive INSERT OR IGNORE so an initialised core is untouched).
    c.exec(`
      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, kind TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS metric_types (
        key TEXT PRIMARY KEY, display_name TEXT NOT NULL, unit TEXT NOT NULL,
        value_kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', description TEXT);
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY, timestamp TEXT NOT NULL,
        metric_type TEXT NOT NULL REFERENCES metric_types(key),
        value REAL NOT NULL, unit TEXT NOT NULL,
        source INTEGER NOT NULL REFERENCES sources(id),
        external_id TEXT NOT NULL, source_updated_at TEXT, metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source, external_id, metric_type));
      CREATE INDEX IF NOT EXISTS idx_obs_metric ON observations(metric_type);
      CREATE INDEX IF NOT EXISTS idx_obs_timestamp ON observations(timestamp);
    `);
    const insSrc = c.prepare('INSERT OR IGNORE INTO sources (name, kind) VALUES (?, ?)');
    for (const [n, k] of [['manual', 'user'], ['shred', 'module'], ['apple_health', 'device'], ['lab', 'lab']]) insSrc.run(n, k);
    const insMt = c.prepare("INSERT OR IGNORE INTO metric_types (key, display_name, unit, value_kind, status, description) VALUES (?,?,?,?,'active',?)");
    for (const [key, dn, unit] of [
      ['body.weight', 'Body weight', 'kg'],
      ['fitness.session_volume', 'Session volume', 'kg'],
      ['nutrition.calories', 'Calories', 'kcal'],
      ['nutrition.protein', 'Protein', 'g'],
      ['nutrition.carbs', 'Carbohydrates', 'g'],
      ['nutrition.fat', 'Fat', 'g'],
      ['body.waist', 'Waist circumference', 'cm'],
      ['body.hip', 'Hip circumference', 'cm'],
      ['body.chest', 'Chest circumference', 'cm'],
      ['body.arm', 'Arm circumference', 'cm'],
      ['body.thigh', 'Thigh circumference', 'cm'],
      ['fitness.cardio_minutes', 'Cardio minutes', 'min']
    ]) insMt.run(key, dn, unit, 'numeric', null);

    upsertStmt = c.prepare(`
      INSERT INTO observations
        (metric_type, value, unit, timestamp, source, external_id, source_updated_at, metadata)
      VALUES
        (@metric_type, @value, @unit, @timestamp, @source, @external_id, @source_updated_at, @metadata)
      ON CONFLICT(source, external_id, metric_type) DO UPDATE SET
        value             = excluded.value,
        source_updated_at = excluded.source_updated_at,
        updated_at        = datetime('now')
      WHERE excluded.source_updated_at > observations.source_updated_at;
    `);
    shredSourceId = c.prepare("SELECT id FROM sources WHERE name='shred'").get().id;
    core = c;
    console.log('[core] dual-write enabled ->', path);
  } catch (e) {
    console.error('[core] init failed — dual-write disabled:', e.message);
    core = null;
  }
}
initCore();

// ── Per-record read helpers (against shred.db, post-commit) ──────────────────
const selFoodsDay = db.prepare('SELECT value, updated_at FROM foods WHERE day = ?');
const selSetsDay  = db.prepare('SELECT sets, updated_at FROM sets WHERE day = ?');
const selProduct  = db.prepare('SELECT value FROM products WHERE id = ?');
const selStart    = db.prepare("SELECT value FROM meta WHERE key='startDate'");

function productLookup() {
  const cache = new Map();
  return (id) => {
    if (cache.has(id)) return cache.get(id);
    const row = selProduct.get(id);
    let prod = null;
    if (row) { try { prod = JSON.parse(row.value); } catch { prod = null; } }
    cache.set(id, prod);
    return prod;
  };
}

// ── Public: status + formuleversies (observability, #127) ───────────────────
// Geen secrets — veilig om via de health-API te tonen. De formula_version-
// waarden MOETEN gelijk blijven aan health-core/scripts/lib/aggregate.mjs zodat
// backfill en live-write op dezelfde rij samenvallen.
export function coreStatus() {
  return {
    enabled: !!core,
    path: process.env.CORE_DB || null,
    formulas: {
      nutrition: DERIVED.nutrition.formula_version,        // nutrition_day_v1
      session_volume: DERIVED.volume.formula_version       // session_volume_day_v1
    },
    metrics: Object.keys(UNITS)
  };
}

// ── Public: mirror accepted records into core.db. Best-effort, never throws. ──
export function dualWrite(acceptedRecords) {
  if (!core || !upsertStmt) return;
  try {
    const startRow = selStart.get();
    if (!startRow) return;                       // can't map day -> date
    const startDate = JSON.parse(startRow.value);
    const getProduct = productLookup();

    const rows = [];                             // observation params to upsert
    const foodsDays = new Set();
    const setsDays = new Set();

    for (const rec of acceptedRecords) {
      if (rec.type === 'weights') {
        const day = parseInt(rec.key, 10);
        rows.push({
          metric_type: 'body.weight', value: Number(rec.value), unit: UNITS['body.weight'],
          timestamp: dayToDate(startDate, day), source: shredSourceId,
          external_id: extId.weight(day), source_updated_at: epochToIso(rec.updatedAt),
          metadata: JSON.stringify({ ...LIVE })
        });
      } else if (rec.type === 'measurements') {
        const day = parseInt(rec.key, 10);
        const date = dayToDate(startDate, day);
        const sua = epochToIso(rec.updatedAt);
        const v = rec.value || {};
        for (const [field, metric] of MEASURE_METRICS) {
          const num = Number(v[field]);
          if (!Number.isFinite(num) || num <= 0) continue;   // alleen ingevulde velden spiegelen
          rows.push({
            metric_type: metric, value: round2(num), unit: UNITS[metric],
            timestamp: date, source: shredSourceId, external_id: extId.measurement(date, field),
            source_updated_at: sua, metadata: JSON.stringify({ ...LIVE })
          });
        }
      } else if (rec.type === 'cardio') {
        const day = parseInt(rec.key, 10);
        const mins = Number(rec.value?.durationMin);
        if (Number.isFinite(mins) && mins > 0) {
          const date = dayToDate(startDate, day);
          rows.push({
            metric_type: 'fitness.cardio_minutes', value: round2(mins), unit: UNITS['fitness.cardio_minutes'],
            timestamp: date, source: shredSourceId, external_id: extId.cardio(date),
            source_updated_at: epochToIso(rec.updatedAt), metadata: JSON.stringify({ ...LIVE })
          });
        }
      } else if (rec.type === 'foods') {
        foodsDays.add(parseInt(rec.key, 10));    // re-aggregate whole day below
      } else if (rec.type === 'sets') {
        const day = parseInt(String(rec.key).split(':')[1], 10);
        if (Number.isFinite(day)) setsDays.add(day);
      }
    }

    // foods days -> nutrition.* (re-read committed row)
    for (const day of foodsDays) {
      const row = selFoodsDay.get(day);
      if (!row) continue;
      let val; try { val = JSON.parse(row.value); } catch { continue; }
      const t = nutritionTotals(val, getProduct);
      if (t.itemCount === 0) continue;           // mirror backfill: skip empty days
      const date = dayToDate(startDate, day);
      const sua = epochToIso(row.updated_at);
      const md = JSON.stringify({ ...LIVE, ...DERIVED.nutrition });
      for (const [metric, value] of [
        ['nutrition.calories', t.kcal], ['nutrition.protein', t.p],
        ['nutrition.carbs', t.c], ['nutrition.fat', t.f]
      ]) rows.push({
        metric_type: metric, value: round2(value), unit: UNITS[metric], timestamp: date,
        source: shredSourceId, external_id: extId.foodsDay(date), source_updated_at: sua, metadata: md
      });
    }

    // sets days -> fitness.session_volume (re-read all rows of the day)
    for (const day of setsDays) {
      const dayRows = selSetsDay.all(day);
      const arrays = [];
      let maxUpdated = 0;
      for (const r of dayRows) {
        let a; try { a = JSON.parse(r.sets); } catch { a = []; }
        arrays.push(Array.isArray(a) ? a : (a?.sets || []));
        if (r.updated_at > maxUpdated) maxUpdated = r.updated_at;
      }
      const vol = setsVolume(arrays);
      if (vol <= 0) continue;                    // mirror backfill: skip 0-volume days
      const date = dayToDate(startDate, day);
      rows.push({
        metric_type: 'fitness.session_volume', value: round2(vol), unit: UNITS['fitness.session_volume'],
        timestamp: date, source: shredSourceId, external_id: extId.session(date),
        source_updated_at: epochToIso(maxUpdated), metadata: JSON.stringify({ ...LIVE, ...DERIVED.volume })
      });
    }

    if (!rows.length) return;
    const tx = core.transaction((items) => { for (const o of items) upsertStmt.run(o); });
    tx(rows);
  } catch (e) {
    // Best-effort: a core failure must never affect the shred.db sync response.
    console.error('[core] dual-write skipped (non-fatal):', e.message);
  }
}
