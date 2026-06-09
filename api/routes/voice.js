// POST /api/meals/voice — spraak → gelogde producten.
//
// Pipeline:
//   audio (multipart)  →  self-hosted whisper (STT, blijft op het LAN)
//                      →  Claude Haiku (parse + match tegen Peters bibliotheek)
//                      →  sanity-checks + macro-berekening
//                      →  proposal JSON  (client toont preview, accept = client-side)
//
// Bewust GEEN server-side accept-endpoint: loggen gebeurt client-side via
// nutrition.js (addLogItem/createProduct) zodat het via de bestaande LWW-sync
// loopt en op dag-nummer (1-90) gekeyd blijft. Zie voeding-brief / README.

import { Router } from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';

export const voice = Router();

const ENABLE_VOICE     = (process.env.ENABLE_VOICE || 'true') !== 'false';
const WHISPER_URL      = process.env.WHISPER_URL || 'http://whisper:9000';
const WHISPER_LANGUAGE = process.env.WHISPER_LANGUAGE || 'nl';
const WHISPER_TIMEOUT_MS = 90_000;

// LLM_MODEL uit .env; alleen Claude-modellen worden door de Anthropic SDK
// ondersteund. Onbekende/niet-claude waarde → val terug op Haiku 4.5.
const MODEL = (process.env.LLM_MODEL || '').startsWith('claude')
  ? process.env.LLM_MODEL
  : 'claude-haiku-4-5';

// SDK leest ANTHROPIC_API_KEY uit de env. Constructor valideert niets; een
// ontbrekende key faalt pas bij de call (we vangen dat hieronder netjes af).
const anthropic = new Anthropic();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB — ruim voor ≤60s opname
});

// ---- Sanity-grenzen --------------------------------------------------------
const MAX_GRAMS = 2000;          // > 2 kg in één item is vrijwel zeker fout
const MAX_KCAL_PER_100G = 1000;  // > olijfolie (884) is onrealistisch
const MAX_ITEMS = 25;
const MAX_LIBRARY = 600;

// ---- LLM tool (forced structured output) -----------------------------------

const LOG_ITEMS_TOOL = {
  name: 'log_items',
  description: 'Lever de herkende voedingsitems gestructureerd terug.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Eén entry per gegeten product, in gesproken volgorde.',
        items: {
          type: 'object',
          properties: {
            productId:   { type: ['string', 'null'], description: 'id uit de meegegeven bibliotheek, of null als het product er niet in staat.' },
            productName: { type: 'string', description: 'Nette productnaam (bibliotheeknaam bij match, anders je beste benaming).' },
            grams:       { type: 'number', description: 'Geschatte portie in grammen.' },
            confidence:  { type: 'number', description: 'Zekerheid 0-1 over product + portie samen.' },
            note:        { type: 'string', description: 'Korte toelichting bij schatting/aanname (NL), leeg laten indien triviaal.' },
            isNewProduct:{ type: 'boolean', description: 'true als het product niet in de bibliotheek staat.' },
            newProduct:  {
              type: 'object',
              description: 'Alleen invullen als isNewProduct true is: geschatte macro\'s per 100 g.',
              properties: {
                kcalPer100g: { type: 'number' },
                pPer100g:    { type: 'number' },
                cPer100g:    { type: 'number' },
                fPer100g:    { type: 'number' },
                unitName:    { type: ['string', 'null'] },
                unitGrams:   { type: ['number', 'null'] }
              }
            }
          },
          required: ['productName', 'grams', 'confidence', 'isNewProduct']
        }
      },
      warnings: { type: 'array', items: { type: 'string' }, description: 'Algemene waarschuwingen voor de gebruiker (NL).' }
    },
    required: ['items']
  }
};

const SYSTEM_INSTRUCTIONS = `Je bent een Nederlandse voedingsassistent. De gebruiker spreekt in wat hij heeft gegeten. Zet dat om naar gelogde producten met porties.

Match elk item zo goed mogelijk tegen de meegegeven productbibliotheek (zie het tweede systeembericht). Bij een match: gebruik exact dat productId en de bibliotheeknaam. Staat een product NIET in de bibliotheek: zet productId op null, isNewProduct op true, en geef bij newProduct een realistische schatting van de macro's per 100 g.

Zet vage hoeveelheden om naar grammen (richtlijnen):
- een handje noten = 25 g
- een hand rijst = 75 g rauw of 150 g gekookt (kies op context)
- twee eieren = 100 g (gem. ei 50 g)
- een appel = 180 g, een banaan = 120 g
- een snee brood = 35 g
- een glas melk = 200 g
- een schep/scoop whey = 30 g
- een eetlepel olie = 14 g, een theelepel = 5 g
- een blik tonijn (uitgelekt) = 80 g
- een filet kip = 150 g, een steak = 200 g
Corrigeer rauw vs. bereid gewicht (200 g rauwe kip ≈ 150 g gegrild). Bij twijfel: lager schatten.

Wees eerlijk over onzekerheid: zet confidence 0-1 en een korte NL-note bij elke schatting. Als de gebruiker geen portie noemt, kies een redelijke standaard en zeg dat in de note. Noem je een hoeveelheid die je gokt, verlaag de confidence.

Lever je antwoord UITSLUITEND via de tool log_items. Verzin geen items die niet genoemd zijn.`;

// ---- Route -----------------------------------------------------------------

voice.post('/', upload.single('audio'), async (req, res) => {
  if (!ENABLE_VOICE) return res.status(503).json({ error: 'voice_disabled', message: 'Spraak staat uit (ENABLE_VOICE=false).' });
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'no_api_key', message: 'ANTHROPIC_API_KEY ontbreekt in ~/shred/.env.' });
  }
  if (!req.file || !req.file.buffer?.length) return res.status(400).json({ error: 'no_audio', message: 'Geen audio ontvangen.' });

  const meal = typeof req.body.meal === 'string' ? req.body.meal : '';
  const dayN = parseInt(req.body.dayN) || null;
  const library = safeParse(req.body.library, []);
  const dayContext = safeParse(req.body.dayContext, []);

  // 1) Transcriptie (zelf-gehost whisper, audio verlaat het LAN niet)
  let transcript;
  try {
    transcript = await transcribe(req.file.buffer, req.file.mimetype, req.file.originalname);
  } catch (e) {
    console.error('[voice] whisper error', e?.message);
    return res.status(502).json({ error: 'stt_failed', message: 'Transcriptie mislukt — is de whisper-service bereikbaar?' });
  }
  if (!transcript) {
    return res.json({ transcript: '', items: [], warnings: ['Geen spraak herkend — probeer opnieuw of voeg handmatig toe.'], code: 'empty_transcript' });
  }

  // 2) Parse + match via Claude Haiku (tool-forced JSON, library prompt-cached)
  let parsed;
  try {
    parsed = await parseTranscript({ transcript, meal, library, dayContext });
  } catch (e) {
    const status = e?.status;
    console.error('[voice] anthropic error', status, e?.message);
    if (status === 401) return res.status(503).json({ error: 'bad_api_key', message: 'ANTHROPIC_API_KEY ongeldig.' });
    if (status === 429 || status === 529) return res.status(503).json({ error: 'llm_busy', message: 'LLM tijdelijk overbelast, probeer zo opnieuw.' });
    // Transcript hebben we wel — geef het terug zodat de client handmatig kan.
    return res.json({ transcript, items: [], warnings: ['Kon de tekst niet omzetten naar producten. Bewerk handmatig.'], code: 'parse_failed' });
  }

  // 3) Sanity-checks + autoritatieve macro-berekening (niet de LLM-getallen)
  const libIndex = indexLibrary(library);
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 10) : [];
  const items = [];
  for (const raw of (parsed.items || []).slice(0, MAX_ITEMS)) {
    const item = sanitizeItem(raw, libIndex, warnings);
    if (item) items.push(item);
  }

  res.json({ transcript, meal, dayN, items, warnings });
});

// ---- Transcriptie ----------------------------------------------------------

async function transcribe(buffer, mimetype, filename) {
  const url = `${WHISPER_URL}/asr?task=transcribe&language=${encodeURIComponent(WHISPER_LANGUAGE)}&output=txt`;
  const form = new FormData();
  form.append('audio_file', new Blob([buffer], { type: mimetype || 'audio/webm' }), filename || 'audio.webm');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), WHISPER_TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'POST', body: form, signal: ctrl.signal });
    if (!r.ok) throw new Error(`whisper status ${r.status}`);
    return (await r.text()).trim();
  } finally {
    clearTimeout(t);
  }
}

// ---- LLM parsing -----------------------------------------------------------

async function parseTranscript({ transcript, meal, library, dayContext }) {
  // Compacte bibliotheek voor de prompt: alleen wat de match nodig heeft.
  const compact = library.slice(0, MAX_LIBRARY).map(p => ({
    id: p.id, naam: p.name,
    per100g: { kcal: p.kcalPer100g, p: p.pPer100g, c: p.cPer100g, f: p.fPer100g },
    ...(p.unitName && p.unitGrams ? { eenheid: { naam: p.unitName, gram: p.unitGrams } } : {})
  }));

  const libraryBlock = `Productbibliotheek (macro's per 100 g):\n${JSON.stringify(compact)}`;

  const contextLines = [];
  if (meal) contextLines.push(`Maaltijd: ${meal}.`);
  if (Array.isArray(dayContext) && dayContext.length) {
    contextLines.push(`Al gelogd vandaag: ${dayContext.map(d => `${d.name} ${d.grams}g`).join(', ')}.`);
  }

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: 'text', text: SYSTEM_INSTRUCTIONS },
      // De bibliotheek is stabiel tussen calls → prompt-cachen. (Onder de
      // cache-minimumdrempel cachet het simpelweg niet; geen kwaad.)
      { type: 'text', text: libraryBlock, cache_control: { type: 'ephemeral' } }
    ],
    tools: [LOG_ITEMS_TOOL],
    tool_choice: { type: 'tool', name: 'log_items' },
    messages: [{
      role: 'user',
      content: `${contextLines.join(' ')}\n\nTranscript: "${transcript}"`.trim()
    }]
  });

  const toolUse = msg.content.find(b => b.type === 'tool_use');
  return toolUse?.input || { items: [], warnings: [] };
}

// ---- Sanity + macro's ------------------------------------------------------

function indexLibrary(library) {
  const map = new Map();
  for (const p of library) if (p && p.id) map.set(p.id, p);
  return map;
}

function clampNum(x, lo, hi) { return Math.min(hi, Math.max(lo, Number(x) || 0)); }

function sanitizeItem(raw, libIndex, warnings) {
  const name = String(raw?.productName || '').trim();
  let grams = Number(raw?.grams) || 0;
  if (!name || grams <= 0) return null;

  if (grams > MAX_GRAMS) {
    warnings.push(`${name}: portie van ${Math.round(grams)} g lijkt te hoog, teruggezet naar ${MAX_GRAMS} g.`);
    grams = MAX_GRAMS;
  }

  let confidence = clampNum(raw?.confidence ?? 0.5, 0, 1);
  let per100;          // { kcalPer100g, pPer100g, cPer100g, fPer100g }
  let productId = null;
  let isNew = false;
  let newProduct = null;

  const matched = (raw?.productId && libIndex.get(raw.productId)) || null;
  if (matched) {
    productId = matched.id;
    per100 = matched;
  } else {
    // Onbekend product: gebruik de (geschatte) macro's van de LLM.
    isNew = true;
    const np = raw?.newProduct || {};
    per100 = {
      kcalPer100g: Number(np.kcalPer100g) || 0,
      pPer100g: Number(np.pPer100g) || 0,
      cPer100g: Number(np.cPer100g) || 0,
      fPer100g: Number(np.fPer100g) || 0
    };
    newProduct = {
      kcalPer100g: per100.kcalPer100g,
      pPer100g: per100.pPer100g,
      cPer100g: per100.cPer100g,
      fPer100g: per100.fPer100g,
      unitName: np.unitName || null,
      unitGrams: Number(np.unitGrams) || null
    };
  }

  // Onrealistische energiedichtheid → flaggen + confidence omlaag.
  if (per100.kcalPer100g < 0 || per100.kcalPer100g > MAX_KCAL_PER_100G) {
    warnings.push(`${name}: macro-schatting (${Math.round(per100.kcalPer100g)} kcal/100g) lijkt onrealistisch, controleer dit.`);
    confidence = Math.min(confidence, 0.3);
  }

  const f = grams / 100;
  const macros = {
    kcal: round1((per100.kcalPer100g || 0) * f),
    p:    round1((per100.pPer100g || 0) * f),
    c:    round1((per100.cPer100g || 0) * f),
    f:    round1((per100.fPer100g || 0) * f)
  };

  return {
    productId,
    productName: name,
    grams: Math.round(grams),
    ...macros,
    confidence: round2(confidence),
    note: typeof raw?.note === 'string' ? raw.note.slice(0, 160) : '',
    isNewProduct: isNew,
    ...(isNew ? { newProduct } : {})
  };
}

// ---- Helpers ---------------------------------------------------------------

function safeParse(s, fallback) {
  if (s == null) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}
function round1(x) { return Math.round((Number(x) || 0) * 10) / 10; }
function round2(x) { return Math.round((Number(x) || 0) * 100) / 100; }
