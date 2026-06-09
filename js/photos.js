// Photo CRUD on top of the IDB photos store. Owns the lifecycle of objectURLs
// so the UI can render via state.photos[wk][i].dataUrl without caring whether
// the underlying value came from localStorage migration or a fresh upload.

import { state, getDB, saveState } from './state.js';
import { idb } from './lib/idb.js';

const liveUrls = new Map(); // id -> objectURL

// Geef één photo-metadata-record een renderbare objectURL. De blob komt uit de
// lokale IDB; ontbreekt hij daar (een foto van het andere device waarvan alléén
// de metadata via sync binnenkwam), dan halen we 'm lazily op via
// /api/photos/:id en cachen 'm lokaal. Bewust niet afhankelijk van de
// `_needsBlob`-vlag: saveState() bewaart alleen {id, ts}, dus die vlag overleeft
// een reload niet — "geen lokale blob" is het betrouwbare signaal. Retourneert
// true als er een nieuwe dataUrl gezet is.
async function ensureBlobUrl(meta, week) {
  if (meta.dataUrl) return false;
  let rec = await idb.get(getDB(), 'photos', meta.id);
  if (!(rec && rec.blob)) {
    try {
      const r = await fetch('/api/photos/' + meta.id);
      if (r.ok) {
        const blob = await r.blob();
        rec = { id: meta.id, week: meta.week ?? Number(week), blob, mime: blob.type || meta.mime, ts: meta.ts, synced: true };
        await idb.put(getDB(), 'photos', rec);
      }
    } catch { /* offline — opnieuw proberen bij de volgende render */ }
  }
  if (rec && rec.blob) {
    const url = URL.createObjectURL(rec.blob);
    liveUrls.set(meta.id, url);
    meta.dataUrl = url;
    delete meta._needsBlob;
    return true;
  }
  return false;
}

// Build objectURLs for every photo metadata entry (lokaal of via de API).
// Retourneert true als er minstens één nieuwe dataUrl bijkwam.
export async function hydratePhotoURLs() {
  let changed = false;
  for (const wk in state.photos) {
    for (const meta of state.photos[wk]) {
      if (await ensureBlobUrl(meta, wk)) changed = true;
    }
  }
  return changed;
}

export async function addPhoto({ week, blob, mime }) {
  const id = Date.now();
  const ts = new Date().toISOString();
  await idb.put(getDB(), 'photos', { id, week, blob, mime, ts, synced: false });
  const url = URL.createObjectURL(blob);
  liveUrls.set(id, url);
  state.photos[week] = state.photos[week] || [];
  state.photos[week].push({ id, ts, dataUrl: url });
  await saveState();
  return id;
}

export async function deletePhoto(id) {
  // Geen harde delete: laat een tombstone in de photos-store staan zodat de
  // verwijdering naar de server (en zo naar het andere device) gepusht kan
  // worden — ook als we nú offline zijn. De sync-engine (pushPhotoDeletes)
  // ruimt de tombstone op zodra de DELETE bij frodo geslaagd is.
  const rec = await idb.get(getDB(), 'photos', id);
  await idb.put(getDB(), 'photos', { id, deleted: true, syncedDelete: false, week: rec?.week, ts: rec?.ts });
  const url = liveUrls.get(id);
  if (url) { URL.revokeObjectURL(url); liveUrls.delete(id); }
  for (const wk in state.photos) {
    state.photos[wk] = state.photos[wk].filter(p => p.id !== id);
    if (!state.photos[wk].length) delete state.photos[wk];
  }
  await saveState();
}
