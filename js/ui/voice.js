// Spraak-UI: mic-knop-flow (opnemen → verwerken → voorstel bevestigen) en de
// "Te bevestigen"-banner voor opnames die offline gequeued en later verwerkt
// zijn. Accepteren gebeurt client-side via nutrition.js (loggen + sync).

import { openSheet, closeSheet, sheetBody } from './sheet.js';
import { toast, tick } from './components.js';
import { startRecording, isRecordingSupported, unsupportedReason, testMic } from '../voice/record.js';
import { sendVoice, mealLabel } from '../voice/api.js';
import { enqueueVoice, listPending, removeVoice } from '../voice/queue.js';
import { createProduct, addLogItem, getProduct } from '../nutrition.js';

export { testMic };

const VOICE_PREF_KEY = 'shred_voice_enabled';
const MAX_MS = 60_000;

export function isVoiceEnabled() {
  return localStorage.getItem(VOICE_PREF_KEY) !== 'false';
}
export function setVoiceEnabled(v) {
  localStorage.setItem(VOICE_PREF_KEY, v ? 'true' : 'false');
}

// ---- Opname-flow ----------------------------------------------------------

export async function startVoiceFlow(dayN, mealKey) {
  if (!isRecordingSupported()) { toast(unsupportedReason() || 'Opnemen niet mogelijk', 'error'); return; }

  openSheet();
  renderOpening(mealKey);

  let controller = null;
  let stopping = false;

  async function doStop() {
    if (stopping || !controller) return;
    stopping = true;
    renderProcessing();
    const result = await controller.stop();
    if (!result || !result.blob?.size) { renderError('Geen geluid opgenomen — check je microfoon.'); return; }
    await handleResult(dayN, mealKey, result);
  }
  async function doCancel() {
    if (controller) await controller.cancel();
    closeSheet();
  }

  try {
    controller = await startRecording({
      maxMs: MAX_MS,
      onTick: updateTimer,
      onAutoStop: () => { toast('Max 60 sec — opname gestopt', null); doStop(); }
    });
  } catch (e) {
    renderError(e?.message || 'Kon de microfoon niet starten.');
    return;
  }
  tick(8);
  renderRecording(mealKey, doStop, doCancel);
}

function renderOpening(mealKey) {
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="voice-rec">
      <div class="vr-dot idle"></div>
      <div class="vr-hint">Microfoon openen…</div>
      <div class="vr-sub">${escapeHtml(mealLabel(mealKey))}</div>
    </div>`;
}

function renderRecording(mealKey, onStop, onCancel) {
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="voice-rec">
      <div class="vr-dot rec"></div>
      <div class="vr-timer" id="voiceTimer">00:00</div>
      <div class="vr-hint">Spreek in wat je at…</div>
      <div class="vr-sub">${escapeHtml(mealLabel(mealKey))}</div>
      <div class="vr-actions">
        <button class="btn-ghost" id="vrCancel">Annuleer</button>
        <button class="btn-primary" id="vrStop">Stop</button>
      </div>
    </div>`;
  document.getElementById('vrStop').onclick = onStop;
  document.getElementById('vrCancel').onclick = onCancel;
}

function updateTimer(ms) {
  const el = document.getElementById('voiceTimer');
  if (!el) return;
  const s = Math.floor(ms / 1000);
  el.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function renderProcessing() {
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="voice-rec">
      <div class="vr-spinner"></div>
      <div class="vr-hint">Even verwerken…</div>
    </div>`;
}

function renderError(msg) {
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="voice-rec">
      <div class="vr-dot err"></div>
      <div class="vr-hint">${escapeHtml(msg)}</div>
      <div class="vr-actions"><button class="btn-primary" id="vrClose">Sluiten</button></div>
    </div>`;
  document.getElementById('vrClose').onclick = closeSheet;
}

// Audio is opgenomen → naar backend, of bij offline in de queue.
async function handleResult(dayN, mealKey, result) {
  try {
    const proposal = await sendVoice({ blob: result.blob, mime: result.mime, mealKey, dayN });
    openPreview(dayN, mealKey, proposal, null);
  } catch (e) {
    // Permanente config-fouten (geen/ongeldige API-key, spraak uit) NIET queuen:
    // queuen zou de opname forever laten herproberen zonder dat het ooit lukt.
    // Alleen écht tijdelijke fouten (geen verbinding, whisper plat, LLM druk)
    // gaan in de offline-wachtrij.
    const permanent = e?.code === 'no_api_key' || e?.code === 'bad_api_key' || e?.code === 'voice_disabled';
    const transient = !permanent && (e?.status === 0 || e?.status >= 502);
    if (transient) {
      try {
        await enqueueVoice({ blob: result.blob, mime: result.mime, mealKey, dayN });
        closeSheet();
        toast('🎙 Opname opgeslagen — wordt verwerkt zodra je thuis bent', 'success');
      } catch {
        renderError('Opname kon niet worden opgeslagen.');
      }
    } else {
      renderError(e?.message || 'Verwerken mislukt.');
    }
  }
}

// ---- Voorstel-modal (accept/edit) -----------------------------------------

// Module-state van het actieve voorstel (klein genoeg; één modal tegelijk).
let preview = null;

export function openPreview(dayN, mealKey, proposal, queueId) {
  openSheet();
  const items = (proposal.items || []).map((it) => ({ ...it, include: true, grams: Math.round(Number(it.grams) || 0) }));
  preview = { dayN, mealKey, items, queueId, transcript: proposal.transcript || '', warnings: proposal.warnings || [] };

  if (!items.length) { renderEmptyProposal(dayN, mealKey); return; }
  renderPreview();
}

function renderEmptyProposal(dayN, mealKey) {
  const fromQueue = preview.queueId != null;
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Niets herkend</h3><button class="sheet-close" id="pvClose">✕</button></div>
    <div class="voice-empty">
      <p>Ik begrijp dit niet helemaal.</p>
      ${preview.transcript ? `<div class="vr-transcript">“${escapeHtml(preview.transcript)}”</div>` : ''}
      <div class="vr-actions">
        ${fromQueue ? '' : `<button class="btn-ghost" id="pvRetry">Opnieuw</button>`}
        <button class="btn-primary" id="pvManual">Handmatig toevoegen</button>
      </div>
      ${fromQueue ? `<button class="danger-btn" id="pvDiscard">Verwijder opname</button>` : ''}
    </div>`;
  document.getElementById('pvClose').onclick = closeSheet;
  const retry = document.getElementById('pvRetry');
  if (retry) retry.onclick = () => startVoiceFlow(dayN, mealKey);
  document.getElementById('pvManual').onclick = closeSheet; // sectie heeft een "handmatig"-knop
  const disc = document.getElementById('pvDiscard');
  if (disc) disc.onclick = () => discardPending();
}

function renderPreview() {
  const { mealKey, items, queueId, transcript, warnings } = preview;
  const rows = items.map((it, i) => itemRowHtml(it, i)).join('');
  const warnHtml = warnings.length
    ? `<div class="vr-warns">${warnings.map((w) => `<div>⚠ ${escapeHtml(w)}</div>`).join('')}</div>` : '';

  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Voorstel — ${escapeHtml(mealLabel(mealKey))}</h3><button class="sheet-close" id="pvClose">✕</button></div>
    ${transcript ? `<div class="vr-transcript">“${escapeHtml(transcript)}”</div>` : ''}
    ${warnHtml}
    <div class="vr-help">Tik ✓ om items aan/uit te zetten · pas grammen aan · <b>Bevestig</b> logt ze. Items met lage zekerheid even checken loont.</div>
    <div class="sheet-list voice-list" id="pvList">${rows}</div>
    <div class="vr-total" id="pvTotal"></div>
    <div class="vr-confirm">
      ${queueId != null ? `<button class="danger-btn" id="pvDiscard">Verwijder</button>` : `<button class="btn-ghost" id="pvCancelBtn">Annuleer</button>`}
      <button class="btn-primary" id="pvConfirm">Bevestig</button>
    </div>`;

  document.getElementById('pvClose').onclick = closeSheet;
  const cancelBtn = document.getElementById('pvCancelBtn');
  if (cancelBtn) cancelBtn.onclick = closeSheet;
  const disc = document.getElementById('pvDiscard');
  if (disc) disc.onclick = () => discardPending();
  document.getElementById('pvConfirm').onclick = confirmPreview;

  wireRows();
  updateTotal();
}

function itemRowHtml(it, i) {
  const per = per100Of(it);
  const m = macrosAt(per, it.grams);
  const badge = it.isNewProduct ? `<span class="vr-badge new">nieuw</span>` : '';
  const pill = confPill(Number(it.confidence));
  // Voor nieuwe producten de per-100g macro's tonen zodat Peter de schatting
  // kan checken vóór hij hem als nieuw product opslaat.
  const per100 = it.isNewProduct
    ? `<div class="vr-per100">per 100 g: ${Math.round(per.kcal)} kcal · P${round1(per.p)} C${round1(per.c)} F${round1(per.f)}</div>`
    : '';
  return `
    <div class="voice-row ${it.include ? '' : 'off'}" data-i="${i}">
      <button class="vr-check ${it.include ? 'on' : ''}" data-toggle="${i}" aria-label="Aan/uit">✓</button>
      <div class="food-info">
        <div class="food-name">${escapeHtml(it.productName)} ${badge}${pill}</div>
        <div class="food-macros" data-macro="${i}">${macroLine(m)}</div>
        ${per100}
        ${it.note ? `<div class="vr-note">${escapeHtml(it.note)}</div>` : ''}
      </div>
      <div class="vr-grams">
        <input type="number" inputmode="decimal" data-grams="${i}" value="${it.grams}"><span>g</span>
      </div>
    </div>`;
}

// Confidence-pill per voorstel-item: alleen tonen bij twijfel (>= 0.8 = stil),
// zodat de lijst rustig blijft en aandacht naar de onzekere items gaat.
function confPill(conf) {
  if (!Number.isFinite(conf) || conf >= 0.8) return '';
  if (conf >= 0.6) return `<span class="vr-conf warn" title="Schatting — controleer">schatting</span>`;
  return `<span class="vr-conf bad" title="Lage zekerheid">lage zekerheid</span>`;
}

function wireRows() {
  const list = document.getElementById('pvList');
  list.querySelectorAll('[data-toggle]').forEach((b) => {
    b.onclick = () => {
      const i = +b.dataset.toggle;
      preview.items[i].include = !preview.items[i].include;
      b.classList.toggle('on', preview.items[i].include);
      b.closest('.voice-row').classList.toggle('off', !preview.items[i].include);
      updateTotal();
    };
  });
  list.querySelectorAll('[data-grams]').forEach((inp) => {
    inp.oninput = () => {
      const i = +inp.dataset.grams;
      preview.items[i].grams = Number(inp.value) || 0;
      const per = per100Of(preview.items[i]);
      const macroEl = list.querySelector(`[data-macro="${i}"]`);
      if (macroEl) macroEl.innerHTML = macroLine(macrosAt(per, preview.items[i].grams));
      updateTotal();
    };
  });
}

function updateTotal() {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const it of preview.items) {
    if (!it.include) continue;
    const m = macrosAt(per100Of(it), it.grams);
    t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f;
  }
  const el = document.getElementById('pvTotal');
  if (el) el.innerHTML = `Totaal: <b>${Math.round(t.kcal)}</b> kcal · P${round1(t.p)} C${round1(t.c)} F${round1(t.f)}`;
}

function confirmPreview() {
  const { dayN, mealKey, items, queueId } = preview;
  let n = 0;
  for (const it of items) {
    if (!it.include) continue;
    const grams = Number(it.grams) || 0;
    if (grams <= 0) continue;
    let productId = it.productId;
    if (!productId) {
      const np = it.newProduct || {};
      const p = createProduct({
        name: it.productName,
        kcalPer100g: +np.kcalPer100g || 0,
        pPer100g: +np.pPer100g || 0,
        cPer100g: +np.cPer100g || 0,
        fPer100g: +np.fPer100g || 0,
        unitName: np.unitName || null,
        unitGrams: +np.unitGrams || null
      });
      productId = p.id;
    } else if (!getProduct(productId)) {
      continue; // product is intussen verwijderd
    }
    addLogItem(dayN, mealKey, productId, grams);
    n++;
  }
  if (queueId != null) removeVoice(queueId).then(renderPendingBanner).catch(() => {});
  preview = null;
  closeSheet();
  tick(10);
  document.dispatchEvent(new CustomEvent('shred:food-changed'));
  toast(`${n} ${n === 1 ? 'item' : 'items'} toegevoegd`, 'success');
}

function discardPending() {
  if (preview?.queueId != null) removeVoice(preview.queueId).then(renderPendingBanner).catch(() => {});
  preview = null;
  closeSheet();
}

// ---- "Te bevestigen"-banner ------------------------------------------------

function ensureBannerHost() {
  let host = document.getElementById('voiceBanner');
  if (host) return host;
  const tab = document.getElementById('tab-food');
  if (!tab) return null;
  host = document.createElement('div');
  host.id = 'voiceBanner';
  tab.insertBefore(host, tab.firstChild);
  return host;
}

export async function renderPendingBanner() {
  const host = ensureBannerHost();
  if (!host) return;
  let pending = [];
  try { pending = await listPending(); } catch { /* ignore */ }
  if (!pending.length) { host.innerHTML = ''; host.style.display = 'none'; return; }
  host.style.display = '';
  host.innerHTML = `
    <button class="voice-banner" id="voiceBannerBtn">
      <span class="vb-ic">🎙</span>
      <span class="vb-txt">${pending.length} spraak-opname${pending.length === 1 ? '' : 's'} te bevestigen</span>
      <span class="vb-go">Bekijk →</span>
    </button>`;
  document.getElementById('voiceBannerBtn').onclick = () => {
    const rec = pending[0];
    openPreview(rec.dayN, rec.mealKey, { transcript: rec.transcript, items: rec.items, warnings: rec.warnings }, rec.id);
  };
}

// ---- Macro-helpers ---------------------------------------------------------

function per100Of(it) {
  if (it.productId) {
    const p = getProduct(it.productId);
    if (p) return { kcal: p.kcalPer100g, p: p.pPer100g, c: p.cPer100g, f: p.fPer100g };
  }
  if (it.newProduct) {
    const np = it.newProduct;
    return { kcal: +np.kcalPer100g || 0, p: +np.pPer100g || 0, c: +np.cPer100g || 0, f: +np.fPer100g || 0 };
  }
  // Fallback: leid per-100g af uit de meegegeven (op grammen berekende) macro's.
  const g = Number(it.grams) || 100;
  return { kcal: (it.kcal || 0) / g * 100, p: (it.p || 0) / g * 100, c: (it.c || 0) / g * 100, f: (it.f || 0) / g * 100 };
}

function macrosAt(per100, grams) {
  const f = (Number(grams) || 0) / 100;
  return { kcal: (per100.kcal || 0) * f, p: (per100.p || 0) * f, c: (per100.c || 0) * f, f: (per100.f || 0) * f };
}

function macroLine(m) {
  return `${Math.round(m.kcal)} kcal · <b>P${round1(m.p)}</b> C${round1(m.c)} F${round1(m.f)}`;
}

function round1(x) {
  const r = Math.round((Number(x) || 0) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
