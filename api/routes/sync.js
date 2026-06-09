import { Router } from 'express';
import { db } from '../db.js';
import { dualWrite } from '../core.js';

export const sync = Router();

// Map each logical record `type` to the (table, key-column, value-column) and
// helpers to translate between { key, value } payload and table row.
const TYPES = {
  meta: {
    table: 'meta',
    selectAll: 'SELECT key, value, updated_at FROM meta WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM meta WHERE key = ?',
    upsert: `INSERT INTO meta (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'meta', key: r.key, value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertMeta.run(key, JSON.stringify(value), ts)
  },
  day_log: {
    table: 'day_log',
    selectAll: 'SELECT day, completed, notes, updated_at FROM day_log WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM day_log WHERE day = ?',
    upsert: `INSERT INTO day_log (day, completed, notes, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET completed=excluded.completed, notes=excluded.notes, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({
      type: 'day_log',
      key: String(r.day),
      value: { completed: r.completed ? JSON.parse(r.completed) : {}, notes: r.notes || '' },
      updatedAt: r.updated_at
    }),
    apply: (key, value, ts) => upsertDayLog.run(parseInt(key), JSON.stringify(value.completed || {}), value.notes || '', ts)
  },
  sets: {
    table: 'sets',
    selectAll: 'SELECT ex_id, day, sets, updated_at FROM sets WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM sets WHERE ex_id = ? AND day = ?',
    upsert: `INSERT INTO sets (ex_id, day, sets, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(ex_id, day) DO UPDATE SET sets=excluded.sets, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({
      type: 'sets',
      key: `${r.ex_id}:${r.day}`,
      value: JSON.parse(r.sets),
      updatedAt: r.updated_at
    }),
    apply: (key, value, ts) => {
      const [exId, dayStr] = key.split(':');
      return upsertSets.run(exId, parseInt(dayStr), JSON.stringify(value), ts);
    },
    selectArgs: (key) => { const [exId, day] = key.split(':'); return [exId, parseInt(day)]; }
  },
  exercise_notes: {
    table: 'exercise_notes',
    selectAll: 'SELECT ex_id, day, note, updated_at FROM exercise_notes WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM exercise_notes WHERE ex_id = ? AND day = ?',
    upsert: `INSERT INTO exercise_notes (ex_id, day, note, updated_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(ex_id, day) DO UPDATE SET note=excluded.note, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({
      type: 'exercise_notes',
      key: `${r.ex_id}:${r.day}`,
      value: r.note || '',
      updatedAt: r.updated_at
    }),
    apply: (key, value, ts) => {
      const [exId, dayStr] = key.split(':');
      return upsertExerciseNotes.run(exId, parseInt(dayStr), String(value || ''), ts);
    }
  },
  weights: {
    table: 'weights',
    selectAll: 'SELECT day, kg, updated_at FROM weights WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM weights WHERE day = ?',
    upsert: `INSERT INTO weights (day, kg, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET kg=excluded.kg, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'weights', key: String(r.day), value: r.kg, updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertWeights.run(parseInt(key), Number(value), ts)
  },
  foods: {
    table: 'foods',
    selectAll: 'SELECT day, value, updated_at FROM foods WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM foods WHERE day = ?',
    upsert: `INSERT INTO foods (day, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'foods', key: String(r.day), value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertFoods.run(parseInt(key), JSON.stringify(value), ts)
  },
  product: {
    table: 'products',
    selectAll: 'SELECT id, value, updated_at FROM products WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM products WHERE id = ?',
    upsert: `INSERT INTO products (id, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'product', key: r.id, value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertProducts.run(key, JSON.stringify(value), ts)
  },
  template: {
    table: 'meal_templates',
    selectAll: 'SELECT id, value, updated_at FROM meal_templates WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM meal_templates WHERE id = ?',
    upsert: `INSERT INTO meal_templates (id, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'template', key: r.id, value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertTemplates.run(key, JSON.stringify(value), ts)
  },
  slot_choices: {
    table: 'slot_choices',
    selectAll: 'SELECT day, value, updated_at FROM slot_choices WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM slot_choices WHERE day = ?',
    upsert: `INSERT INTO slot_choices (day, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'slot_choices', key: String(r.day), value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertSlotChoices.run(parseInt(key), JSON.stringify(value || {}), ts)
  },
  measurements: {
    table: 'measurements',
    selectAll: 'SELECT day, value, updated_at FROM measurements WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM measurements WHERE day = ?',
    upsert: `INSERT INTO measurements (day, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'measurements', key: String(r.day), value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertMeasurements.run(parseInt(key), JSON.stringify(value || {}), ts)
  },
  cardio: {
    table: 'cardio',
    selectAll: 'SELECT day, value, updated_at FROM cardio WHERE updated_at > ?',
    selectOne: 'SELECT updated_at FROM cardio WHERE day = ?',
    upsert: `INSERT INTO cardio (day, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(day) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
    rowToRecord: (r) => ({ type: 'cardio', key: String(r.day), value: JSON.parse(r.value), updatedAt: r.updated_at }),
    apply: (key, value, ts) => upsertCardio.run(parseInt(key), JSON.stringify(value || {}), ts)
  }
};

const upsertMeta    = db.prepare(TYPES.meta.upsert);
const upsertDayLog  = db.prepare(TYPES.day_log.upsert);
const upsertSets    = db.prepare(TYPES.sets.upsert);
const upsertExerciseNotes = db.prepare(TYPES.exercise_notes.upsert);
const upsertWeights = db.prepare(TYPES.weights.upsert);
const upsertFoods     = db.prepare(TYPES.foods.upsert);
const upsertProducts  = db.prepare(TYPES.product.upsert);
const upsertTemplates = db.prepare(TYPES.template.upsert);
const upsertSlotChoices = db.prepare(TYPES.slot_choices.upsert);
const upsertMeasurements = db.prepare(TYPES.measurements.upsert);
const upsertCardio       = db.prepare(TYPES.cardio.upsert);
const selectMetaTs      = db.prepare(TYPES.meta.selectOne);
const selectDayLogTs    = db.prepare(TYPES.day_log.selectOne);
const selectSetsTs      = db.prepare(TYPES.sets.selectOne);
const selectExerciseNotesTs = db.prepare(TYPES.exercise_notes.selectOne);
const selectWeightsTs   = db.prepare(TYPES.weights.selectOne);
const selectFoodsTs     = db.prepare(TYPES.foods.selectOne);
const selectProductTs   = db.prepare(TYPES.product.selectOne);
const selectTemplateTs  = db.prepare(TYPES.template.selectOne);
const selectSlotChoicesTs = db.prepare(TYPES.slot_choices.selectOne);
const selectMeasurementsTs = db.prepare(TYPES.measurements.selectOne);
const selectCardioTs       = db.prepare(TYPES.cardio.selectOne);
const selectAll = {
  meta: db.prepare(TYPES.meta.selectAll),
  day_log: db.prepare(TYPES.day_log.selectAll),
  sets: db.prepare(TYPES.sets.selectAll),
  exercise_notes: db.prepare(TYPES.exercise_notes.selectAll),
  weights: db.prepare(TYPES.weights.selectAll),
  foods: db.prepare(TYPES.foods.selectAll),
  product: db.prepare(TYPES.product.selectAll),
  template: db.prepare(TYPES.template.selectAll),
  slot_choices: db.prepare(TYPES.slot_choices.selectAll),
  measurements: db.prepare(TYPES.measurements.selectAll),
  cardio: db.prepare(TYPES.cardio.selectAll),
};
const selectPhotos = db.prepare(
  'SELECT id, week, filename, mime, size, deleted, created_at, updated_at FROM photos WHERE updated_at > ?'
);

function existingTs(type, key) {
  switch (type) {
    case 'meta':    return selectMetaTs.get(key)?.updated_at ?? -1;
    case 'day_log': return selectDayLogTs.get(parseInt(key))?.updated_at ?? -1;
    case 'sets':    {
      const [exId, day] = key.split(':');
      return selectSetsTs.get(exId, parseInt(day))?.updated_at ?? -1;
    }
    case 'exercise_notes': {
      const [exId, day] = key.split(':');
      return selectExerciseNotesTs.get(exId, parseInt(day))?.updated_at ?? -1;
    }
    case 'weights':  return selectWeightsTs.get(parseInt(key))?.updated_at ?? -1;
    case 'foods':    return selectFoodsTs.get(parseInt(key))?.updated_at ?? -1;
    case 'product':  return selectProductTs.get(key)?.updated_at ?? -1;
    case 'template': return selectTemplateTs.get(key)?.updated_at ?? -1;
    case 'slot_choices': return selectSlotChoicesTs.get(parseInt(key))?.updated_at ?? -1;
    case 'measurements': return selectMeasurementsTs.get(parseInt(key))?.updated_at ?? -1;
    case 'cardio':       return selectCardioTs.get(parseInt(key))?.updated_at ?? -1;
    default: return -1;
  }
}

// GET /api/sync?since=<epoch_ms>
sync.get('/', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const records = [];
  for (const type of Object.keys(selectAll)) {
    for (const row of selectAll[type].all(since)) {
      records.push(TYPES[type].rowToRecord(row));
    }
  }
  // Photos as metadata-only records; blob fetched separately via /api/photos/:id.
  for (const p of selectPhotos.all(since)) {
    records.push({
      type: 'photo',
      key: String(p.id),
      value: {
        id: p.id, week: p.week, filename: p.filename, mime: p.mime,
        size: p.size, deleted: !!p.deleted, createdAt: p.created_at
      },
      updatedAt: p.updated_at
    });
  }
  res.json({ records, serverTime: Date.now() });
});

// POST /api/sync  body: { records: [{ type, key, value, updatedAt }, ...] }
sync.post('/', (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  let accepted = 0, rejected = 0;
  const acceptedRecords = [];

  const apply = db.transaction((items) => {
    for (const rec of items) {
      const handler = TYPES[rec.type];
      if (!handler) { rejected++; continue; }
      const ts = Number(rec.updatedAt) || 0;
      const current = existingTs(rec.type, rec.key);
      if (ts > current) {
        handler.apply(rec.key, rec.value, ts);
        acceptedRecords.push(rec);
        accepted++;
      } else {
        rejected++;
      }
    }
  });
  apply(records);

  // Health Core dual-write (Fase A): additive, best-effort mirror of the just-
  // accepted records into core.db. dualWrite() guards itself internally; this
  // extra try/catch ensures even an unexpected throw can never block or alter
  // the primary shred.db sync response below.
  try { dualWrite(acceptedRecords); } catch (e) { console.error('[core] dual-write call failed (non-fatal):', e.message); }

  res.json({ accepted, rejected, serverTime: Date.now() });
});
