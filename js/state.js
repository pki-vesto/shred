// Persistent state, backed by IndexedDB. The in-memory `state` object is the
// single source of truth for the UI; saveState() persists it to IDB.
//
// Photos are NOT stored in this serialised state — they live as Blobs in a
// separate object store (see lib/photos.js). state.photos[wk] holds metadata
// records with a `dataUrl` field that is set to a fresh objectURL after
// hydration.

import { openDB, idb } from './lib/idb.js';

export const state = {
  viewDay: 1,
  foodViewDay: 1,
  completed: {},
  notes: {},
  sets: {},
  exerciseNotes: {},
  weights: {},
  measurements: {},   // measurements[day] = { waist, hip, chest, arm, thigh } in cm
  photos: {},
  foods: {},
  // Product library (id -> product) and meal templates (id -> template).
  // See js/nutrition.js for the record shapes and CRUD helpers.
  products: {},
  mealTemplates: {},
  goals: { kcal: 2250, p: 180, c: 220, f: 65 },
  suggestedDeload: {},
  // Exercise-swap: welke oefening Peter koos voor een slot op een specifieke
  // dag (slotChoices[day][slotId] = exId), en de onthouden standaard-voorkeur
  // per slot tussen sessies door (slotDefaults[slotId] = exId).
  slotChoices: {},
  slotDefaults: {},
  startDate: null,
  // Per-record updatedAt for sync — ts[type][key] = ms epoch.
  ts: {}
};

const DB_NAME = 'shred-db';
const DB_VERSION = 1;
const LEGACY_KEY = 'shred_state_v2';
const STATE_KEY = 'app_state';
const MIGRATION_KEY = 'migrated_from_localstorage';

let db = null;

export async function initStore() {
  db = await openDB(DB_NAME, DB_VERSION, (database) => {
    if (!database.objectStoreNames.contains('kv'))     database.createObjectStore('kv');
    if (!database.objectStoreNames.contains('photos')) database.createObjectStore('photos', { keyPath: 'id' });
    if (!database.objectStoreNames.contains('queue'))  database.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
  });
  return db;
}

export function getDB() { return db; }

export async function loadState() {
  if (!db) await initStore();

  const migrated = await idb.get(db, 'kv', MIGRATION_KEY);
  if (!migrated) await migrateFromLocalStorage();

  const stored = await idb.get(db, 'kv', STATE_KEY);
  if (stored) Object.assign(state, stored);

  state.completed = state.completed || {};
  state.notes = state.notes || {};
  state.sets = state.sets || {};
  state.exerciseNotes = state.exerciseNotes || {};
  state.weights = state.weights || {};
  state.measurements = state.measurements || {};
  state.photos = state.photos || {};
  state.foods = state.foods || {};
  state.products = state.products || {};
  state.mealTemplates = state.mealTemplates || {};
  state.goals = state.goals || { kcal: 2250, p: 180, c: 220, f: 65 };
  state.suggestedDeload = state.suggestedDeload || {};
  state.slotChoices = state.slotChoices || {};
  state.slotDefaults = state.slotDefaults || {};
  state.ts = state.ts || {};
}

// Mark a logical record as locally mutated NOW and persist. Callers replace
// the old `saveState()` after a mutation; the sync engine reads state.ts to
// build the outgoing record list and to do LWW on incoming changes.
//
// Types: 'meta' | 'day_log' | 'sets' | 'exercise_notes' | 'weights' |
//        'foods' | 'product' | 'template' | 'slot_choices' | 'measurements'
// Key formats:
//   meta:         'goals' | 'startDate' | 'suggestedDeload' | 'slotDefaults'
//   day_log:      '<day>'           (e.g. '7')
//   sets:         '<exId>:<day>'    (e.g. 'bench:5')
//   exercise_notes: '<exId>:<day>'
//   weights:      '<day>'
//   foods:        '<day>'
//   product:      '<productId>'     (uuid or 'seed:<slug>')
//   template:     '<templateId>'    (uuid)
//   slot_choices: '<day>'           (waarde: { slotId: exId } voor die dag)
//   measurements: '<day>'           (waarde: { waist, hip, chest, arm, thigh } in cm)
export function mutate(type, key) {
  state.ts = state.ts || {};
  state.ts[type] = state.ts[type] || {};
  state.ts[type][key] = Date.now();
  saveState();
}

// Async, fire-and-forget. Callers do not await — UI mutations are reflected
// in-memory immediately; persistence is best-effort and serialised by IDB.
export function saveState() {
  if (!db) return Promise.resolve();
  // Strip out objectURLs before persisting; they are runtime-only.
  const photos = {};
  for (const wk in state.photos) {
    photos[wk] = state.photos[wk].map(p => ({ id: p.id, ts: p.ts }));
  }
  const snapshot = { ...state, photos };
  return idb.put(db, 'kv', snapshot, STATE_KEY).catch(e => console.error('saveState', e));
}

async function migrateFromLocalStorage() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    await idb.put(db, 'kv', { at: Date.now(), source: 'empty' }, MIGRATION_KEY);
    return;
  }
  let legacy;
  try { legacy = JSON.parse(raw); } catch { legacy = {}; }

  const photoMeta = {};
  if (legacy.photos && typeof legacy.photos === 'object') {
    for (const wk in legacy.photos) {
      photoMeta[wk] = [];
      for (const p of legacy.photos[wk] || []) {
        try {
          const blob = await (await fetch(p.dataUrl)).blob();
          await idb.put(db, 'photos', { id: p.id, week: parseInt(wk), blob, mime: blob.type, ts: p.ts, synced: false });
          photoMeta[wk].push({ id: p.id, ts: p.ts });
        } catch (e) {
          console.warn('photo migration skipped', p.id, e?.message);
        }
      }
    }
  }

  // Stamp all existing records with `now` so the first sync push wins against
  // an empty server. If the server already has newer data, LWW resolves it.
  const now = Date.now();
  const ts = { meta: {}, day_log: {}, sets: {}, exercise_notes: {}, weights: {}, foods: {} };
  if (legacy.goals)           ts.meta.goals = now;
  if (legacy.startDate)       ts.meta.startDate = now;
  if (legacy.suggestedDeload) ts.meta.suggestedDeload = now;
  for (const n in (legacy.completed || {})) ts.day_log[n] = now;
  for (const n in (legacy.notes || {}))     ts.day_log[n] = now;
  for (const exId in (legacy.sets || {})) {
    for (const s of legacy.sets[exId] || []) ts.sets[`${exId}:${s.day}`] = now;
  }
  for (const n in (legacy.weights || {})) ts.weights[n] = now;
  for (const n in (legacy.foods || {}))   ts.foods[n] = now;

  const migrated = { ...legacy, photos: photoMeta, ts };
  await idb.put(db, 'kv', migrated, STATE_KEY);
  await idb.put(db, 'kv', { at: Date.now(), source: 'localStorage' }, MIGRATION_KEY);
  console.log('[shred] migrated state from localStorage to IndexedDB');
  // localStorage is intentionally NOT cleared — rollback-safe backup.
}

// Test helper / settings "reset" flow uses this. Wipes everything including
// the migration flag so a subsequent migration could re-run.
export async function wipeAll() {
  if (!db) await initStore();
  await idb.clear(db, 'kv');
  await idb.clear(db, 'photos');
  await idb.clear(db, 'queue');
}
