// Offline wachtrij voor spraak-opnames. Gebruikt de (al bestaande, autoIncrement)
// 'queue' object-store in IndexedDB. Een record gaat door twee statussen:
//   'queued'  — audio opgeslagen, nog niet verwerkt (frodo niet bereikbaar)
//   'parsed'  — door de backend omgezet naar items, wacht op bevestiging in de UI
// Na 'parsed' wordt de audio-blob gewist (privacy: niet bewaren na verwerking).

import { getDB } from '../state.js';
import { idb } from '../lib/idb.js';
import { sendVoice } from './api.js';

export async function enqueueVoice({ blob, mime, mealKey, dayN }) {
  const db = getDB();
  if (!db) throw new Error('geen db');
  const rec = {
    kind: 'voice',
    status: 'queued',
    audioBlob: blob,
    mime,
    mealKey,
    dayN,
    createdAt: Date.now()
  };
  return idb.put(db, 'queue', rec);   // autoIncrement → retourneert de nieuwe id
}

async function allVoice() {
  const db = getDB();
  if (!db) return [];
  const all = await idb.getAll(db, 'queue');
  return all.filter((r) => r && r.kind === 'voice');
}

// Records die op gebruikersbevestiging wachten (voor de "Te bevestigen"-banner).
export async function listPending() {
  return (await allVoice())
    .filter((r) => r.status === 'parsed')
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getVoice(id) {
  const db = getDB();
  if (!db) return null;
  return idb.get(db, 'queue', id);
}

export async function removeVoice(id) {
  const db = getDB();
  if (!db) return;
  await idb.del(db, 'queue', id);
}

async function markParsed(id, proposal) {
  const db = getDB();
  const rec = await idb.get(db, 'queue', id);
  if (!rec) return;
  rec.status = 'parsed';
  rec.transcript = proposal.transcript || '';
  rec.items = proposal.items || [];
  rec.warnings = proposal.warnings || [];
  delete rec.audioBlob;          // audio na verwerking weggooien
  await idb.put(db, 'queue', rec);
}

// Verwerk alle gequeue'de opnames. Aangeroepen door de sync-engine bij
// (her)verbinding, vóór de gewone state-sync. Stopt bij de eerste fout zodat we
// niet blijven hameren als frodo/LLM nog even niet beschikbaar is.
// Retourneert het aantal nieuw verwerkte opnames.
export async function processVoiceQueue() {
  const db = getDB();
  if (!db) return 0;
  let processed = 0;
  for (const rec of await allVoice()) {
    if (rec.status !== 'queued' || !rec.audioBlob) continue;
    try {
      const proposal = await sendVoice({
        blob: rec.audioBlob, mime: rec.mime, mealKey: rec.mealKey, dayN: rec.dayN
      });
      await markParsed(rec.id, proposal);
      processed++;
    } catch (e) {
      console.warn('[voice] queue-item blijft staan:', e?.message);
      break;
    }
  }
  if (processed > 0) {
    document.dispatchEvent(new CustomEvent('shred:voice-pending'));
  }
  return processed;
}
