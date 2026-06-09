// POST /api/products/lookup — schat macro's per 100 g voor een nieuw product.
//
// De client stuurt alleen een productnaam; Claude Haiku schat de macro's, de
// backend doet sanity-checks en geeft een preview-vriendelijk object terug. De
// client toont een verplichte preview en slaat pas op na bevestiging (zie
// js/ui/food.js). Geen server-side opslag: producten leven client-side en
// syncen via de bestaande LWW-sync.
//
// Zelfde Anthropic-patroon als routes/voice.js: tool-forced JSON + nette
// foutafhandeling per HTTP-status. Geen auth (Tailscale is de auth-laag).

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

export const products = Router();

// LLM_MODEL uit .env; alleen Claude-modellen worden ondersteund. Onbekende of
// niet-claude waarde → val terug op Haiku 4.5. (Gelijk aan routes/voice.js.)
const MODEL = (process.env.LLM_MODEL || '').startsWith('claude')
  ? process.env.LLM_MODEL
  : 'claude-haiku-4-5';

// SDK leest ANTHROPIC_API_KEY uit de env; een ontbrekende key faalt pas bij de
// call (we vangen dat hieronder af).
const anthropic = new Anthropic();

// ---- Sanity-grenzen --------------------------------------------------------
const MAX_KCAL_PER_100G = 900;   // olijfolie ~884; daarboven vrijwel zeker fout
const SUM_TOLERANCE = 0.15;      // 4·P + 4·C + 9·F mag 15% van kcal afwijken
const MAX_NAME = 120;
const MAX_NOTES = 200;

// ---- LLM tool (forced structured output) -----------------------------------

const MACRO_TOOL = {
  name: 'report_macros',
  description: 'Lever de geschatte macro\'s per 100 g gestructureerd terug.',
  input_schema: {
    type: 'object',
    properties: {
      name:        { type: 'string', description: 'Nette productnaam (NL), evt. gecorrigeerd t.o.v. de input.' },
      kcalPer100g: { type: 'number', description: 'Energie in kcal per 100 g.' },
      pPer100g:    { type: 'number', description: 'Eiwit in gram per 100 g.' },
      cPer100g:    { type: 'number', description: 'Koolhydraten in gram per 100 g.' },
      fPer100g:    { type: 'number', description: 'Vet in gram per 100 g.' },
      confidence:  { type: 'number', description: 'Zekerheid 0-1 over de schatting.' },
      notes:       { type: 'string', description: 'Korte NL-toelichting, max 1 zin, alleen indien nuttig.' }
    },
    required: ['name', 'kcalPer100g', 'pPer100g', 'cPer100g', 'fPer100g', 'confidence']
  }
};

const SYSTEM_INSTRUCTIONS = `Je bent een voedingsdatabase voor een Nederlandse fitness-app. De gebruiker geeft een productnaam in het Nederlands. Geef de gemiddelde macro's per 100 g.

Regels:
- Lever je antwoord UITSLUITEND via de tool report_macros.
- Bij twijfel tussen rauw/gekookt: kies de meest gangbare variant en vermeld dat in notes.
- Bij merkproducten: gebruik het gemiddelde van vergelijkbare producten en vermeld dat het een schatting is.
- Confidence: 0.9+ voor generieke ingrediënten (kipfilet, rijst, banaan), 0.6-0.8 voor merken, <0.6 voor onduidelijke namen.
- Sanity bounds: kcal/100g tussen 0 en 900; de macro's moeten ongeveer optellen tot de kcal (4·P + 4·C + 9·F).
- Notes: kort, max 1 zin, alleen als nuttig (bv. "rauw gemiddelde" of "gekookt, ongezouten").
- Bij een onbekend of onduidelijk product: confidence < 0.5 en een korte uitleg in notes.`;

// ---- Route -----------------------------------------------------------------

products.post('/lookup', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Auto-lookup staat uit (ANTHROPIC_API_KEY ontbreekt).', code: 'no_api_key' });
  }

  const name = String(req.body?.name || '').trim().slice(0, MAX_NAME);
  if (!name) return res.status(400).json({ error: 'Geef een productnaam op.', code: 'no_name' });

  // 1) Macro-schatting via Claude Haiku (tool-forced JSON)
  let raw;
  try {
    raw = await lookupMacros(name);
  } catch (e) {
    const status = e?.status;
    console.error('[products] anthropic error', status, e?.message);
    if (status === 401) return res.status(503).json({ error: 'ANTHROPIC_API_KEY ongeldig.', code: 'bad_api_key' });
    if (status === 429 || status === 529) return res.status(503).json({ error: 'LLM tijdelijk overbelast, probeer zo opnieuw.', code: 'llm_busy' });
    return res.status(500).json({ error: 'Kon macro\'s niet bepalen, voer handmatig in', code: 'llm_failed' });
  }

  // 2) Sanity-checks + afronding (autoritatief, niet blind de LLM-getallen)
  const result = sanitize(name, raw);
  if (!result) {
    console.warn('[products] sanity failed for', JSON.stringify(name), '->', JSON.stringify(raw));
    return res.status(500).json({ error: 'Kon macro\'s niet bepalen, voer handmatig in', code: 'sanity_failed' });
  }

  res.json(result);
});

// ---- LLM call --------------------------------------------------------------

async function lookupMacros(name) {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_INSTRUCTIONS,
    tools: [MACRO_TOOL],
    tool_choice: { type: 'tool', name: 'report_macros' },
    messages: [{ role: 'user', content: `Productnaam: "${name}"` }]
  });
  const toolUse = msg.content.find(b => b.type === 'tool_use');
  return toolUse?.input || null;
}

// ---- Sanity + afronding ----------------------------------------------------

// Retourneert een preview-vriendelijk object, of null als de schatting niet
// door de sanity-checks komt (caller geeft dan een 500 + handmatig-fallback).
//
// Bewuste keuze: ontbrekende/onbruikbare macro's worden 0, en kcal wordt zo
// nodig afgeleid uit de macro's. Zo komt een onzeker product (bv. een
// onduidelijke naam) tóch als low-confidence voorstel in de preview — met de
// note + rode confidence-indicator — i.p.v. een harde fout. Peter beslist dan
// zelf (zie brief: "toon waarschuwing in preview, laat Peter beslissen"). We
// blokkeren alleen écht bizarre output: geen tool-respons of een kcal-getal
// buiten [0, 900].
function sanitize(reqName, raw) {
  if (!raw || typeof raw !== 'object') return null;

  const p = numOr0(raw.pPer100g);
  const c = numOr0(raw.cPer100g);
  const f = numOr0(raw.fPer100g);

  // kcal: gebruik de schatting; ontbreekt/ongeldig → afleiden uit de macro's.
  let kcal = num(raw.kcalPer100g);
  if (kcal == null) kcal = 4 * p + 4 * c + 9 * f;
  // Een expliciet onrealistisch kcal-getal blijft een harde fail.
  if (kcal < 0 || kcal > MAX_KCAL_PER_100G) return null;

  let confidence = num(raw.confidence);
  if (confidence == null) confidence = 0.5;
  confidence = clamp(confidence, 0, 1);

  let notes = typeof raw.notes === 'string' ? raw.notes.trim() : '';

  // Optelsom-check: 4·P + 4·C + 9·F ≈ kcal. Bij >15% afwijking: waarschuwing in
  // notes (geen harde fail — de LLM mag afronden, en vezels/alcohol vertekenen).
  if (kcal > 0) {
    const computed = 4 * p + 4 * c + 9 * f;
    if (Math.abs(computed - kcal) / kcal > SUM_TOLERANCE) {
      notes = joinNote(notes, `Let op: macro's (${Math.round(computed)} kcal) en kcal-waarde wijken af — controleer.`);
    }
  }

  const llmName = typeof raw.name === 'string' ? raw.name.trim() : '';
  const name = (llmName || reqName).slice(0, MAX_NAME);
  if (!name) return null;

  return {
    name,
    kcalPer100g: Math.round(kcal),
    pPer100g: round1(p),
    cPer100g: round1(c),
    fPer100g: round1(f),
    confidence: round2(confidence),
    notes: notes.slice(0, MAX_NOTES)
  };
}

// ---- Helpers ---------------------------------------------------------------

// Eindig, niet-negatief getal → de waarde; anders null.
function num(x) {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
// Zelfde, maar onbruikbare waarde → 0 (voor macro's die we niet hard willen falen).
function numOr0(x) { return num(x) ?? 0; }
// Voeg een waarschuwing netjes achter een bestaande note (met scheidingsteken).
function joinNote(base, extra) {
  if (!base) return extra;
  return /[.!?]$/.test(base) ? `${base} ${extra}` : `${base}. ${extra}`;
}
function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
function round1(x) { return Math.round(x * 10) / 10; }
function round2(x) { return Math.round(x * 100) / 100; }
