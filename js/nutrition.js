// Product-gebaseerd voedingssysteem: bibliotheek, porties, templates, macro's.
// Houdt alle voeding-state-mutaties + sync-stamping op één plek; js/ui/food.js
// en js/ui/settings.js zijn puur UI bovenop deze helpers.

import { state, mutate } from './state.js';
import { SEED_PRODUCTS, MEAL_CATEGORIES } from './seed.js';
import { MEALS } from './meals.js';

export const CATEGORY_KEYS = MEAL_CATEGORIES.map(c => c.key);

export function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'p-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
}

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

// ---- Product CRUD --------------------------------------------------------

function blankProduct(over = {}) {
  const now = Date.now();
  return {
    id: over.id || uuid(),
    name: '',
    kcalPer100g: 0, pPer100g: 0, cPer100g: 0, fPer100g: 0,
    unitName: null, unitGrams: null,   // optionele eenheid (bv. ei = 50g)
    isFavorite: false,
    useCount: 0,
    lastUsedAt: 0,
    lastGrams: 100,                     // onthoudt laatste portie
    hidden: false,                      // soft-delete als er logs bestaan
    deleted: false,                     // sync-tombstone (hard delete)
    seed: false,                        // afkomstig uit startbibliotheek
    fromLegacy: false,                  // gemigreerd uit oude data
    createdAt: now,
    updatedAt: now,
    ...over
  };
}

export function createProduct(fields) {
  const p = blankProduct(fields);
  state.products[p.id] = p;
  mutate('product', p.id);
  return p;
}

export function updateProduct(id, fields) {
  const p = state.products[id];
  if (!p) return null;
  Object.assign(p, fields, { updatedAt: Date.now() });
  mutate('product', id);
  return p;
}

export function toggleFavorite(id) {
  const p = state.products[id];
  if (!p) return;
  updateProduct(id, { isFavorite: !p.isFavorite });
}

// Of een product nog gelogd is op een dag (bepaalt of we mogen hard-deleten).
export function productInUse(id) {
  for (const day in state.foods) {
    const d = state.foods[day];
    for (const cat of CATEGORY_KEYS) {
      if ((d?.[cat] || []).some(it => it.productId === id)) return true;
    }
  }
  for (const tid in state.mealTemplates) {
    const t = state.mealTemplates[tid];
    if (t.deleted) continue;
    if ((t.items || []).some(it => it.productId === id)) return true;
  }
  return false;
}

// Verwijderen: als het product nog gebruikt wordt -> verbergen (behoud macro's
// voor historische logs). Anders echte tombstone zodat het ook van andere
// devices verdwijnt.
export function removeProduct(id) {
  if (productInUse(id)) {
    updateProduct(id, { hidden: true });
    return 'hidden';
  }
  updateProduct(id, { deleted: true });
  return 'deleted';
}

// Lijst zichtbare producten (niet-verwijderd, niet-verborgen).
export function visibleProducts() {
  return Object.values(state.products).filter(p => !p.deleted && !p.hidden);
}

// Product opzoeken inclusief verborgen/verwijderd (voor weergave van bestaande
// logs — een log op een ander device kan nog naar een hier-getombstonet product
// verwijzen, dan willen we toch naam + macro's tonen). visibleProducts() doet
// het filteren voor de keuzelijsten.
export function getProduct(id) {
  return state.products[id] || null;
}

// ---- Macro's -------------------------------------------------------------

export function macrosFor(product, grams) {
  const f = (Number(grams) || 0) / 100;
  return {
    kcal: (product?.kcalPer100g || 0) * f,
    p:    (product?.pPer100g || 0) * f,
    c:    (product?.cPer100g || 0) * f,
    f:    (product?.fPer100g || 0) * f
  };
}

// Dagtotalen over alle maaltijden.
export function dayTotals(dayN) {
  const totals = { kcal: 0, p: 0, c: 0, f: 0 };
  const d = state.foods[dayN];
  if (!d) return totals;
  for (const cat of CATEGORY_KEYS) {
    for (const it of (d[cat] || [])) {
      const p = state.products[it.productId];
      if (!p) continue;
      const m = macrosFor(p, it.grams);
      totals.kcal += m.kcal; totals.p += m.p; totals.c += m.c; totals.f += m.f;
    }
  }
  return totals;
}

export function categoryKcal(dayN, cat) {
  let kcal = 0;
  for (const it of (state.foods[dayN]?.[cat] || [])) {
    const p = state.products[it.productId];
    if (p) kcal += macrosFor(p, it.grams).kcal;
  }
  return kcal;
}

// ---- Loggen --------------------------------------------------------------

export function emptyDay() {
  return { ontbijt: [], lunch: [], snack: [], diner: [] };
}

export function ensureDay(dayN) {
  const cur = state.foods[dayN];
  if (!cur || !CATEGORY_KEYS.every(k => Array.isArray(cur[k]))) {
    state.foods[dayN] = { ...emptyDay(), ...(cur || {}) };
    for (const k of CATEGORY_KEYS) if (!Array.isArray(state.foods[dayN][k])) state.foods[dayN][k] = [];
  }
  return state.foods[dayN];
}

export function addLogItem(dayN, cat, productId, grams) {
  const day = ensureDay(dayN);
  day[cat].push({ productId, grams: Number(grams) || 0, addedAt: Date.now() });
  mutate('foods', String(dayN));
  // Bump usage-stats + onthoud portie.
  const p = state.products[productId];
  if (p) updateProduct(productId, {
    useCount: (p.useCount || 0) + 1,
    lastUsedAt: Date.now(),
    lastGrams: Number(grams) || p.lastGrams || 100
  });
}

export function updateLogItem(dayN, cat, index, grams) {
  const day = ensureDay(dayN);
  if (!day[cat][index]) return;
  day[cat][index].grams = Number(grams) || 0;
  mutate('foods', String(dayN));
}

export function removeLogItem(dayN, cat, index) {
  const day = ensureDay(dayN);
  day[cat].splice(index, 1);
  mutate('foods', String(dayN));
}

// ---- Templates -----------------------------------------------------------

export function visibleTemplates(category) {
  return Object.values(state.mealTemplates)
    .filter(t => !t.deleted && (!category || t.category === category));
}

export function saveTemplate(name, category, items) {
  const now = Date.now();
  const t = {
    id: uuid(),
    name: name.trim(),
    category,
    items: items.map(it => ({ productId: it.productId, grams: it.grams })),
    useCount: 0,
    lastUsedAt: 0,
    deleted: false,
    createdAt: now,
    updatedAt: now
  };
  state.mealTemplates[t.id] = t;
  mutate('template', t.id);
  return t;
}

export function deleteTemplate(id) {
  const t = state.mealTemplates[id];
  if (!t) return;
  t.deleted = true;
  t.updatedAt = Date.now();
  mutate('template', id);
}

// Voeg alle items van een template toe aan een maaltijd-sectie.
export function applyTemplate(dayN, cat, templateId) {
  const t = state.mealTemplates[templateId];
  if (!t) return 0;
  let n = 0;
  for (const it of (t.items || [])) {
    if (!state.products[it.productId]) continue;   // product verwijderd
    addLogItem(dayN, cat, it.productId, it.grams);
    n++;
  }
  if (n) {
    t.useCount = (Number(t.useCount) || 0) + 1;
    t.lastUsedAt = Date.now();
    t.updatedAt = t.lastUsedAt;
    mutate('template', t.id);
  }
  return n;
}

export function templateAnalytics(category = null, limit = 5) {
  const templates = visibleTemplates(category);
  const used = templates.filter(t => Number(t.useCount) > 0);
  const top = used
    .slice()
    .sort((a, b) =>
      (Number(b.useCount) || 0) - (Number(a.useCount) || 0)
      || (Number(b.lastUsedAt) || 0) - (Number(a.lastUsedAt) || 0)
      || a.name.localeCompare(b.name, 'nl'))
    .slice(0, limit)
    .map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      useCount: Number(t.useCount) || 0,
      lastUsedAt: Number(t.lastUsedAt) || 0
    }));
  return {
    totalTemplates: templates.length,
    usedTemplates: used.length,
    totalUses: used.reduce((sum, t) => sum + (Number(t.useCount) || 0), 0),
    top
  };
}

// ---- Seed + migratie -----------------------------------------------------

// Installeer (of herstel) de startbibliotheek. Deterministische ids zorgen
// dat dit idempotent is en op meerdere devices niet dupliceert.
// reset=true zet macro's terug en haalt seed-producten uit 'hidden'/'deleted'.
export function installSeed(reset = false) {
  for (const s of SEED_PRODUCTS) {
    const id = 'seed:' + s.slug;
    const existing = state.products[id];
    if (existing && !reset) continue;
    const now = Date.now();
    const base = existing || blankProduct({ id, createdAt: now });
    Object.assign(base, {
      name: s.name,
      kcalPer100g: s.kcal, pPer100g: s.p, cPer100g: s.c, fPer100g: s.f,
      unitName: s.unit?.name || null,
      unitGrams: s.unit?.grams || null,
      seed: true,
      updatedAt: now
    });
    if (reset) { base.hidden = false; base.deleted = false; }
    state.products[id] = base;
    mutate('product', id);
  }
}

const CODE_TO_CAT = { O: 'ontbijt', L: 'lunch', S: 'snack', D: 'diner' };

// Lichtgewicht migratie: zet oude foods ({mealsAdded, extras}) om naar het
// nieuwe product-gebaseerde model en bewaar het origineel onder foods_legacy.
// Retourneert true als er daadwerkelijk oude data is omgezet.
function migrateLegacyFoods() {
  const legacy = {};
  let migrated = false;

  for (const day in state.foods) {
    const d = state.foods[day];
    const isOld = d && (Array.isArray(d.mealsAdded) || Array.isArray(d.extras));
    if (!isOld) continue;
    migrated = true;
    legacy[day] = d;
    const cat = emptyDay();
    const now = Date.now();

    for (const code of (d.mealsAdded || [])) {
      const m = MEALS[code];
      if (!m) continue;
      const pid = 'legacy:' + code;
      if (!state.products[pid]) {
        // Macro's zijn per-portie; opgeslagen als per-100g + 100g-portie
        // zodat de totalen kloppen. Verborgen: vervuilt de bibliotheek niet.
        createProduct({
          id: pid, name: 'Legacy: ' + code + ' — ' + m.name,
          kcalPer100g: m.kcal, pPer100g: m.p, cPer100g: m.c, fPer100g: m.f,
          fromLegacy: true, hidden: true
        });
      }
      const c = CODE_TO_CAT[code[0]] || 'snack';
      cat[c].push({ productId: pid, grams: 100, addedAt: now });
    }

    for (const ex of (d.extras || [])) {
      const pid = 'legacy:extra:' + slugify(ex.name);
      if (!state.products[pid]) {
        createProduct({
          id: pid, name: ex.name,
          kcalPer100g: +ex.kcal || 0, pPer100g: +ex.p || 0,
          cPer100g: +ex.c || 0, fPer100g: +ex.f || 0,
          fromLegacy: true
        });
      }
      cat.snack.push({ productId: pid, grams: 100, addedAt: now });
    }

    state.foods[day] = cat;
    mutate('foods', String(day));
  }

  if (migrated) {
    state.foods_legacy = { ...(state.foods_legacy || {}), ...legacy };
  }
  return migrated;
}

// Eénmalige init bij app-load. Retourneert { migrated } zodat de UI een
// banner kan tonen.
export function initNutrition() {
  state.products = state.products || {};
  state.mealTemplates = state.mealTemplates || {};
  state.foods = state.foods || {};

  let migrated = false;
  if (!state._nutritionMigrated) {
    migrated = migrateLegacyFoods();
    state._nutritionMigrated = true;
  }

  // Seed één keer per device. Niet gaten op een lege bibliotheek: na een
  // migratie staan er al legacy-producten in, maar de seed moet er tóch komen.
  // installSeed is idempotent (deterministische ids) dus dubbel draaien kan
  // geen kwaad; de vlag voorkomt dat we per load verwijderde seeds herstellen.
  if (!state._seedInstalled) {
    installSeed();
    state._seedInstalled = true;
  }

  return { migrated };
}

// Normaliseer een (mogelijk via sync binnengekomen) oude-shape foods-entry.
// Defensief: zodat renderFood nooit op {mealsAdded} struikelt.
export function normalizeDay(dayN) {
  const d = state.foods[dayN];
  if (d && (Array.isArray(d.mealsAdded) || Array.isArray(d.extras))) {
    // Behandel als nog-niet-gemigreerd: zet om en bewaar origineel.
    state._nutritionMigrated = false;
    migrateLegacyFoods();
    state._nutritionMigrated = true;
  }
  return ensureDay(dayN);
}
