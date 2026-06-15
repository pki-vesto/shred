// Sync engine. Talks to /api/sync and /api/photos over the tailnet. No app-level
// auth — Tailscale gates access at the network layer, so no token is sent.
// State.ts is the single source of truth for "what changed when" client-side.
// Last-write-wins per record, ties go to whichever side has the later ts.

import { state, saveState, getDB } from './state.js';
import { idb } from './lib/idb.js';
import { processVoiceQueue } from './voice/queue.js';

const SYNC_META_KEY = 'sync_meta';
const HEALTH_TIMEOUT_MS = 2000;
const PERIOD_MS = 30_000;

let lastSyncTs = 0;
let lastApplied = 0;
let lastError = '';
let timer = null;
let inflight = false;
let lastStatus = { state: 'idle', at: 0 };
const subscribers = new Set();

export function onStatus(cb) {
  subscribers.add(cb);
  cb(getStatus());
  return () => subscribers.delete(cb);
}

export function getStatus() {
  return { ...lastStatus, lastSyncTs, lastApplied, lastError, pendingOutbound: pendingOutboundCount() };
}

export function getDiagnostics() {
  return getStatus();
}

function emit(state, extra = {}) {
  if (state === 'ok') lastError = '';
  if (state === 'fail' || state === 'offline') lastError = extra.error || state;
  lastStatus = { state, at: Date.now(), ...extra };
  for (const cb of subscribers) cb(getStatus());
}

export async function init() {
  const meta = await idb.get(getDB(), 'kv', SYNC_META_KEY);
  if (meta?.lastSyncTs) lastSyncTs = meta.lastSyncTs;
  start();
}

export function start() {
  stop();
  syncNow();
  timer = setInterval(syncNow, PERIOD_MS);
  window.addEventListener('online', syncNow);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

export async function syncNow() {
  if (inflight) return;
  inflight = true;
  emit('syncing');
  try {
    if (!(await pingHealth())) { emit('offline', { error: 'API niet bereikbaar' }); return; }

    // Eerst gequeue'de spraak-opnames afhandelen (audio → voorstel), dan de
    // gewone state-sync. Geen-op als de wachtrij leeg is.
    try { await processVoiceQueue(); } catch (e) { console.warn('voice queue', e?.message); }

    const outbound = buildOutboundRecords();
    if (outbound.length) {
      const r = await api('POST', '/api/sync', { records: outbound });
      if (r === 'unauthorized') return;
      if (!r.ok) { emit('fail', { error: 'Verzenden mislukt' }); return; }
      clearOutboundRecords(outbound);
      await saveState();
    }

    await pushPhotoDeletes();
    await uploadPendingPhotos();

    const r2 = await api('GET', `/api/sync?since=${lastSyncTs}`);
    if (r2 === 'unauthorized') return;
    if (!r2.ok) { emit('fail', { error: 'Ophalen mislukt' }); return; }
    const data = await r2.json();

    const applied = applyIncomingRecords(data.records);
    lastApplied = applied;
    lastSyncTs = data.serverTime;
    await idb.put(getDB(), 'kv', { lastSyncTs }, SYNC_META_KEY);
    if (applied > 0) await saveState();

    emit('ok', { applied });
    if (applied > 0) {
      document.dispatchEvent(new CustomEvent('shred:state-applied', { detail: { applied } }));
    }
  } catch (e) {
    console.error('sync error', e);
    emit('fail', { error: e?.message || 'Sync mislukt' });
  } finally {
    inflight = false;
  }
}

function pendingOutboundCount() {
  try { return buildOutboundRecords().length; }
  catch { return 0; }
}

function clearOutboundRecords(records) {
  for (const rec of records) {
    if (!state.ts?.[rec.type]) continue;
    // Lost-update guard: a mutate() during the in-flight POST bumps this key's
    // timestamp to a newer value still pending sync. Only clear the queue entry
    // if it has NOT been re-touched since we captured it, else we'd silently
    // drop that newer change.
    if (state.ts[rec.type][rec.key] !== rec.updatedAt) continue;
    delete state.ts[rec.type][rec.key];
    if (!Object.keys(state.ts[rec.type]).length) delete state.ts[rec.type];
  }
}

async function pingHealth() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
  try {
    const r = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' });
    return r.ok;
  } catch { return false; }
  finally { clearTimeout(t); }
}

async function api(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(url, opts);
  if (r.status === 401) { emit('fail'); return 'unauthorized'; }
  return r;
}

function buildOutboundRecords() {
  state.ts = state.ts || {};
  const out = [];
  for (const type of ['meta', 'day_log', 'sets', 'exercise_notes', 'weights', 'foods', 'product', 'template', 'slot_choices', 'measurements', 'cardio']) {
    const tsMap = state.ts[type] || {};
    for (const key in tsMap) {
      const updatedAt = tsMap[key];
      const value = readValue(type, key);
      if (value === undefined) continue;
      out.push({ type, key, value, updatedAt });
    }
  }
  return out;
}

export function readValue(type, key) {
  switch (type) {
    case 'meta':
      if (key === 'goals')           return state.goals;
      if (key === 'startDate')       return state.startDate;
      if (key === 'suggestedDeload') return state.suggestedDeload;
      if (key === 'slotDefaults')    return state.slotDefaults;
      if (key === 'favoriteExercises') return state.favoriteExercises || {};
      return undefined;
    case 'day_log': {
      const n = parseInt(key);
      return { completed: state.completed[n] || {}, notes: state.notes[n] || '' };
    }
    case 'sets': {
      const [exId, dayStr] = key.split(':');
      const day = parseInt(dayStr);
      const entry = state.sets[exId]?.find(s => s.day === day);
      return entry?.sets ?? [];
    }
    case 'exercise_notes': {
      const [exId, dayStr] = key.split(':');
      return state.exerciseNotes?.[exId]?.[parseInt(dayStr)] || '';
    }
    case 'weights':  return state.weights[parseInt(key)];
    case 'foods':    return state.foods[parseInt(key)];
    case 'product':  return state.products[key];
    case 'template': return state.mealTemplates[key];
    case 'slot_choices': return state.slotChoices[parseInt(key)] || {};
    case 'measurements': return state.measurements[parseInt(key)] || {};
    case 'cardio': return state.cardio[parseInt(key)] || {};
  }
}

function applyIncomingRecords(records) {
  state.ts = state.ts || {};
  let applied = 0;
  for (const rec of records) {
    if (rec.type === 'photo') { applyIncomingPhotoMeta(rec); continue; }
    const localTs = state.ts[rec.type]?.[rec.key] ?? 0;
    // Server wins ties to neutralise client clock skew.
    if (rec.updatedAt <= localTs) continue;
    writeValue(rec.type, rec.key, rec.value);
    state.ts[rec.type] = state.ts[rec.type] || {};
    state.ts[rec.type][rec.key] = rec.updatedAt;
    applied++;
  }
  return applied;
}

export function writeValue(type, key, value) {
  switch (type) {
    case 'meta':
      if (key === 'goals')           state.goals = value;
      else if (key === 'startDate')  state.startDate = value;
      else if (key === 'suggestedDeload') state.suggestedDeload = value;
      else if (key === 'slotDefaults') state.slotDefaults = value || {};
      else if (key === 'favoriteExercises') state.favoriteExercises = value || {};
      break;
    case 'day_log': {
      const n = parseInt(key);
      state.completed[n] = value?.completed || {};
      state.notes[n]     = value?.notes || '';
      break;
    }
    case 'sets': {
      const [exId, dayStr] = key.split(':');
      const day = parseInt(dayStr);
      state.sets[exId] = state.sets[exId] || [];
      const i = state.sets[exId].findIndex(s => s.day === day);
      if (i >= 0) state.sets[exId][i].sets = value;
      else {
        state.sets[exId].push({ day, sets: value });
        state.sets[exId].sort((a, b) => a.day - b.day);
      }
      break;
    }
    case 'exercise_notes': {
      const [exId, dayStr] = key.split(':');
      const day = parseInt(dayStr);
      state.exerciseNotes[exId] = state.exerciseNotes[exId] || {};
      if (value) state.exerciseNotes[exId][day] = String(value);
      else delete state.exerciseNotes[exId][day];
      break;
    }
    case 'weights':
      state.weights[parseInt(key)] = value;
      break;
    case 'foods':
      state.foods[parseInt(key)] = value;
      break;
    case 'product':
      // value kan een tombstone zijn (deleted:true) of hidden product;
      // de UI filtert via visibleProducts(). We bewaren het record zodat
      // bestaande logs hun macro's houden en tombstones doorsijpelen.
      state.products[key] = value;
      break;
    case 'template':
      state.mealTemplates[key] = value;
      break;
    case 'slot_choices': {
      const day = parseInt(key);
      if (value && Object.keys(value).length) state.slotChoices[day] = value;
      else delete state.slotChoices[day];
      break;
    }
    case 'measurements': {
      const day = parseInt(key);
      if (value && Object.keys(value).length) state.measurements[day] = value;
      else delete state.measurements[day];
      break;
    }
    case 'cardio': {
      const day = parseInt(key);
      if (value && Object.keys(value).length) state.cardio[day] = value;
      else delete state.cardio[day];
      break;
    }
  }
}

function applyIncomingPhotoMeta(rec) {
  // Photo records: server tells us about new/deleted photos. We fetch the
  // blob lazily via /api/photos/:id when first rendered.
  // Track in state.photos (metadata) with the server's id; UI body.js renders
  // dataUrl by demand-loading the blob into IDB on first view.
  const id = parseInt(rec.key);
  const meta = rec.value;
  if (meta?.deleted) {
    for (const wk in state.photos) {
      state.photos[wk] = state.photos[wk].filter(p => p.id !== id);
      if (!state.photos[wk].length) delete state.photos[wk];
    }
    idb.del(getDB(), 'photos', id).catch(() => {});
    return;
  }
  const wk = String(meta.week);
  state.photos[wk] = state.photos[wk] || [];
  if (!state.photos[wk].some(p => p.id === id)) {
    state.photos[wk].push({ id, ts: new Date(meta.createdAt || Date.now()).toISOString(), week: meta.week, mime: meta.mime, _needsBlob: true });
  }
}

// Push lokale photo-tombstones (zie photos.deletePhoto) als DELETE naar de
// server zodat de verwijdering ook op het andere device doorkomt. Best-effort:
// een mislukte push (offline) blijft staan en wordt de volgende sync herprobeerd.
async function pushPhotoDeletes() {
  const all = await idb.getAll(getDB(), 'photos');
  for (const p of all) {
    if (!p.deleted || p.syncedDelete) continue;
    try {
      const r = await fetch('/api/photos/' + p.id, { method: 'DELETE' });
      if (r.ok || r.status === 404) await idb.del(getDB(), 'photos', p.id);
    } catch { /* offline — volgende sync opnieuw */ }
  }
}

async function uploadPendingPhotos() {
  const all = await idb.getAll(getDB(), 'photos');
  for (const p of all) {
    if (p.deleted) continue;     // tombstone — afgehandeld door pushPhotoDeletes
    if (p.synced) continue;
    if (!p.blob) continue;
    const form = new FormData();
    form.append('file', p.blob, `photo-${p.id}`);
    form.append('week', String(p.week));
    form.append('id', String(p.id));
    form.append('ts', p.ts || new Date().toISOString());
    const r = await fetch('/api/photos', {
      method: 'POST',
      body: form
    });
    if (r.ok) {
      p.synced = true;
      await idb.put(getDB(), 'photos', p);
    }
  }
}
