// Client-kant van /api/meals/voice: bouwt de multipart-request (audio +
// bibliotheek + context) en stuurt 'm naar de backend (auth via Tailscale).

import { state } from '../state.js';
import { visibleProducts, getProduct, CATEGORY_KEYS } from '../nutrition.js';
import { MEAL_CATEGORIES } from '../seed.js';

// Compacte bibliotheek die de backend aan de LLM doorgeeft. De client is de
// bron van waarheid (altijd actueel, ook offline net aangemaakte producten).
export function buildLibrary() {
  return visibleProducts().map((p) => ({
    id: p.id,
    name: p.name,
    kcalPer100g: p.kcalPer100g,
    pPer100g: p.pPer100g,
    cPer100g: p.cPer100g,
    fPer100g: p.fPer100g,
    unitName: p.unitName || null,
    unitGrams: p.unitGrams || null
  }));
}

// Al gelogde items van die dag, als context voor de LLM.
function buildDayContext(dayN) {
  const out = [];
  const d = state.foods[dayN];
  if (!d) return out;
  for (const cat of CATEGORY_KEYS) {
    for (const it of (d[cat] || [])) {
      const p = getProduct(it.productId);
      if (p) out.push({ name: p.name, grams: Math.round(it.grams) });
    }
  }
  return out.slice(0, 30);
}

export function mealLabel(key) {
  return MEAL_CATEGORIES.find((c) => c.key === key)?.label || key;
}

function extFor(mime) {
  if (!mime) return 'webm';
  if (mime.includes('mp4')) return 'm4a';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

// Stuur audio naar de backend en krijg het voorstel terug. Gooit een Error met
// .status bij een HTTP-fout (zodat de caller offline kan queuen).
export async function sendVoice({ blob, mime, mealKey, dayN }) {
  const form = new FormData();
  form.append('audio', blob, `voice.${extFor(mime)}`);
  form.append('meal', mealLabel(mealKey));
  form.append('dayN', String(dayN));
  form.append('library', JSON.stringify(buildLibrary()));
  form.append('dayContext', JSON.stringify(buildDayContext(dayN)));

  let r;
  try {
    r = await fetch('/api/meals/voice', {
      method: 'POST',
      body: form
    });
  } catch (e) {
    const err = new Error('Geen verbinding met frodo.');
    err.status = 0;
    throw err;
  }

  if (!r.ok) {
    let msg = 'Verwerken mislukt.';
    let code = '';
    try { const j = await r.json(); if (j?.message) msg = j.message; if (j?.error) code = j.error; } catch { /* ignore */ }
    const err = new Error(msg);
    err.status = r.status;
    err.code = code;   // bv. 'no_api_key' | 'bad_api_key' | 'voice_disabled' | 'stt_failed' | 'llm_busy'
    throw err;
  }
  return r.json();
}
