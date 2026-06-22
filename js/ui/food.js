import { state } from '../state.js';
import { TOTAL_DAYS, dateForDay, formatDate } from '../helpers.js';
import { weightMetrics } from '../bodyMetrics.js';
import { proteinPerKg } from '../dashboardMetrics.js';
import { tick, toast } from './components.js';
import { openSheet, closeSheet, sheetBody } from './sheet.js';
import { startVoiceFlow, renderPendingBanner, isVoiceEnabled } from './voice.js';
import { MEAL_CATEGORIES } from '../seed.js';
import { lookupMacros } from '../lookup.js';
import {
  normalizeDay, dayTotals, categoryKcal, macrosFor,
  visibleProducts, getProduct, toggleFavorite, createProduct, updateProduct,
  removeProduct, addLogItem, updateLogItem, removeLogItem,
  visibleTemplates, saveTemplate, applyTemplate, deleteTemplate
} from '../nutrition.js';

// Welke maaltijd-secties dichtgeklapt zijn (per categorie-key).
const collapsed = {};

export function renderFood() {
  const n = state.foodViewDay;
  const date = dateForDay(n);
  document.getElementById('foodDayNum').textContent = n;
  document.getElementById('foodDayDate').textContent = formatDate(date);
  document.getElementById('foodPrev').disabled = (n <= 1);
  document.getElementById('foodNext').disabled = (n >= TOTAL_DAYS);

  normalizeDay(n);
  renderPendingBanner();
  renderMacroSummary(dayTotals(n));
  renderSections(n);
}

// ---- Macro samenvatting ---------------------------------------------------

function renderMacroSummary(totals) {
  const g = state.goals;
  const pPerKg = proteinPerKg(g.p, weightMetrics(state.weights));
  const kcalPct = Math.min(100, (totals.kcal / g.kcal) * 100);
  const kcalOver = totals.kcal > g.kcal;
  const left = g.kcal - totals.kcal;

  const macroCell = (lbl, val, goal, cls) => {
    const pct = Math.min(100, (val / goal) * 100);
    const over = val > goal;
    return `<div class="macro-cell">
      <div class="mlabel">${lbl}</div>
      <div class="mval">${Math.round(val)}<span> / ${goal}g</span></div>
      <div class="macro-bar"><div class="macro-bar-fill ${over ? 'over' : cls}" style="width:${pct}%"></div></div>
      ${cls === 'p' && pPerKg !== null ? `<span class="mperkg">~${fmt1(pPerKg)} g/kg</span>` : ''}
    </div>`;
  };

  document.getElementById('macroSummary').innerHTML = `
    <div class="kcal-hero">
      <span class="v num">${Math.round(totals.kcal)}</span>
      <span class="g">/ ${g.kcal} kcal</span>
      <span class="left ${left < 0 ? 'over' : ''}">${left >= 0 ? Math.round(left) + ' over' : Math.round(-left) + ' boven'}</span>
    </div>
    <div class="kcal-track"><div class="fill ${kcalOver ? 'over' : ''}" style="width:${kcalPct}%"></div></div>
    <div class="macro-grid">${macroCell('Eiwit', totals.p, g.p, 'p')}${macroCell('Koolh.', totals.c, g.c, 'c')}${macroCell('Vet', totals.f, g.f, 'f')}</div>`;
}

function fmt1(n) {
  return Number(n).toFixed(1).replace('.', ',');
}

// ---- Maaltijd-secties -----------------------------------------------------

function renderSections(n) {
  const data = state.foods[n];
  let html = '';

  MEAL_CATEGORIES.forEach(({ key, label }) => {
    const items = data[key] || [];
    const kcal = categoryKcal(n, key);
    const isCollapsed = collapsed[key];

    html += `<div class="meal-block ${isCollapsed ? 'collapsed' : ''}" data-cat="${key}">
      <div class="meal-head" data-toggle="${key}">
        <span class="chev">▾</span>
        <span class="meal-title">${label}</span>
        <span class="meal-kcal">${items.length ? Math.round(kcal) + ' kcal' : '—'}</span>
        <button class="meal-menu" data-menu="${key}" aria-label="Opties">⋯</button>
      </div>
      <div class="meal-body">`;

    items.forEach((it, i) => {
      const p = getProduct(it.productId);
      const name = p ? p.name : '(verwijderd product)';
      const m = p ? macrosFor(p, it.grams) : { kcal: 0, p: 0, c: 0, f: 0 };
      html += `<div class="log-item" data-edit="${key}:${i}">
        <div class="food-info">
          <div class="food-name">${escapeHtml(name)} <span class="grams">${fmtGrams(p, it.grams)}</span></div>
          <div class="food-macros">${Math.round(m.kcal)} kcal · <b>P${round1(m.p)}</b> C${round1(m.c)} F${round1(m.f)}</div>
        </div>
        <button class="extra-del" data-del="${key}:${i}" aria-label="Verwijder">✕</button>
      </div>`;
    });

    if (isVoiceEnabled()) {
      html += `<div class="meal-actions">
        <button class="voice-add" data-voice="${key}" aria-label="Spreek in wat je at">
          <span class="mic">🎤</span>${items.length ? 'Meer toevoegen' : 'Spreek in wat je at'}
        </button>
        <button class="extra-add manual" data-add="${key}">Of: handmatig</button>
      </div>`;
    } else {
      html += `<div class="extra-add" data-add="${key}">+ Voeg toe</div>`;
    }
    html += `</div></div>`;
  });

  const sec = document.getElementById('foodSection');
  sec.innerHTML = html;

  // Inklappen
  sec.querySelectorAll('[data-toggle]').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('[data-menu]')) return;
      const k = el.dataset.toggle;
      collapsed[k] = !collapsed[k];
      renderSections(n);
    };
  });
  // Menu (templates)
  sec.querySelectorAll('[data-menu]').forEach(b => {
    b.onclick = (e) => { e.stopPropagation(); openMealMenu(n, b.dataset.menu); };
  });
  // Voeg toe (handmatig)
  sec.querySelectorAll('[data-add]').forEach(b => {
    b.onclick = () => openAddSheet(n, b.dataset.add);
  });
  // Spraak
  sec.querySelectorAll('[data-voice]').forEach(b => {
    b.onclick = () => startVoiceFlow(n, b.dataset.voice);
  });
  // Item bewerken
  sec.querySelectorAll('[data-edit]').forEach(el => {
    el.onclick = (e) => {
      if (e.target.closest('[data-del]')) return;
      const [cat, idx] = el.dataset.edit.split(':');
      const it = state.foods[n][cat][+idx];
      const p = getProduct(it.productId);
      if (p) openPortion(n, cat, p, { editIndex: +idx, grams: it.grams });
    };
  });
  // Item verwijderen
  sec.querySelectorAll('[data-del]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      const [cat, idx] = b.dataset.del.split(':');
      removeLogItem(n, cat, +idx);
      tick(4);
      renderFood();
    };
  });
}

// ---- Sheet-state (sheet-infra zelf zit in ui/sheet.js) --------------------

let activeTab = 'recent';
let searchQuery = '';

// ---- Toevoeg-sheet --------------------------------------------------------

function openAddSheet(dayN, cat) {
  activeTab = 'recent';
  searchQuery = '';
  openSheet();
  renderAddSheet(dayN, cat);
}

function renderAddSheet(dayN, cat, prefill = null) {
  const label = MEAL_CATEGORIES.find(c => c.key === cat)?.label || cat;
  const tabs = [
    ['recent', 'Recent'], ['fav', 'Favorieten'], ['all', 'Alles'], ['new', 'Nieuw']
  ];
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head">
      <h3>Toevoegen — ${label}</h3>
      <button class="sheet-close" id="sheetClose">✕</button>
    </div>
    <input class="sheet-search" id="sheetSearch" type="search" inputmode="search"
           placeholder="Zoek product…" value="${escapeAttr(searchQuery)}">
    <div class="tab-strip">
      ${tabs.map(([k, l]) => `<button class="tab-btn ${activeTab === k ? 'active' : ''}" data-tab="${k}">${l}</button>`).join('')}
    </div>
    <div class="sheet-list" id="sheetList"></div>`;

  document.getElementById('sheetClose').onclick = closeSheet;
  const search = document.getElementById('sheetSearch');
  search.oninput = () => {
    searchQuery = search.value;
    renderAddList(dayN, cat);
  };
  sheetBody().querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => {
      activeTab = b.dataset.tab;
      renderAddSheet(dayN, cat);
      if (activeTab !== 'new') document.getElementById('sheetSearch').value = searchQuery;
    };
  });
  renderAddList(dayN, cat, prefill);
}

function renderAddList(dayN, cat, prefill = null) {
  const list = document.getElementById('sheetList');
  if (activeTab === 'new') { renderNewForm(list, dayN, cat, prefill || {}); return; }

  const q = searchQuery.trim().toLowerCase();
  let products = visibleProducts();

  if (q) {
    // Ranking (#28): matchkwaliteit eerst (exact > prefix > woordbegin >
    // deelstring), daarbinnen op gebruik (vaak/recent) en dan naam. Zo komt het
    // product dat Peter waarschijnlijk bedoelt bovenaan i.p.v. puur alfabetisch.
    products = products
      .map(p => ({ p, rank: matchRank(p.name, q) }))
      .filter(x => x.rank >= 0)
      .sort((a, b) =>
        a.rank - b.rank
        || (b.p.useCount || 0) - (a.p.useCount || 0)
        || (b.p.lastUsedAt || 0) - (a.p.lastUsedAt || 0)
        || a.p.name.localeCompare(b.p.name, 'nl'))
      .map(x => x.p);
  } else if (activeTab === 'recent') {
    products = products.filter(p => p.lastUsedAt > 0)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt).slice(0, 40);
  } else if (activeTab === 'fav') {
    products = products.filter(p => p.isFavorite)
      .sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  } else {
    products = products.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
  }

  if (!products.length) {
    const hint = activeTab === 'recent' ? 'Nog niets gelogd. Kies "Alles" of zoek een product.'
      : activeTab === 'fav' ? 'Nog geen favorieten. Tik op de ster bij een product.'
      : 'Geen product gevonden. Maak er een aan via "Nieuw".';
    list.innerHTML = `<div class="sheet-empty">${hint}</div>`;
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="prod-row" data-prod="${p.id}">
      <button class="fav-star ${p.isFavorite ? 'on' : ''}" data-fav="${p.id}" aria-label="Favoriet">★</button>
      <div class="food-info">
        <div class="food-name">${escapeHtml(p.name)}</div>
        <div class="food-macros">${Math.round(p.kcalPer100g)} kcal · <b>P${round1(p.pPer100g)}</b> C${round1(p.cPer100g)} F${round1(p.fPer100g)} <span class="per">/100g</span></div>
      </div>
      <span class="prod-add">+</span>
    </div>`).join('');

  list.querySelectorAll('[data-fav]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      toggleFavorite(b.dataset.fav);
      renderAddList(dayN, cat);
    };
  });
  list.querySelectorAll('[data-prod]').forEach(row => {
    row.onclick = () => {
      const p = getProduct(row.dataset.prod);
      if (p) openPortion(dayN, cat, p, {});
    };
  });
}

function renderNewForm(list, dayN, cat, prefill = {}) {
  list.innerHTML = `
    <div class="new-form">
      <label>Naam</label>
      <div class="lk-name-row">
        <input type="text" id="npName" placeholder="bv. Magere kwark" value="${escapeAttr(prefill.name || '')}">
        <button type="button" class="lk-find" id="npLookup">🔎 Zoek macro's</button>
      </div>
      <label>Per 100 g</label>
      <div class="grid4">
        <input type="number" inputmode="decimal" id="npKcal" value="${prefill.kcalPer100g ?? ''}" placeholder="kcal">
        <input type="number" inputmode="decimal" id="npP" value="${prefill.pPer100g ?? ''}" placeholder="P">
        <input type="number" inputmode="decimal" id="npC" value="${prefill.cPer100g ?? ''}" placeholder="C">
        <input type="number" inputmode="decimal" id="npF" value="${prefill.fPer100g ?? ''}" placeholder="F">
      </div>
      <label class="opt">Optionele eenheid (bv. "ei" = 50 g) — laat leeg voor alleen gram</label>
      <div class="grid2">
        <input type="text" id="npUnitName" placeholder="naam eenheid">
        <input type="number" inputmode="decimal" id="npUnitGrams" placeholder="gram per stuk">
      </div>
      <button class="btn-primary" id="npSave">Aanmaken & toevoegen</button>
    </div>`;
  if (!prefill.name) document.getElementById('npName').focus();
  document.getElementById('npLookup').onclick = () => {
    const nm = document.getElementById('npName').value.trim();
    startMacroLookup({
      name: nm,
      onConfirm: (fields) => {
        const p = createProduct({ ...productFromFields(fields), source: 'llm' });
        openPortion(dayN, cat, p, {});
      },
      onEdit: (fields) => { activeTab = 'new'; renderAddSheet(dayN, cat, fields); },
      onCancel: () => { activeTab = 'new'; renderAddSheet(dayN, cat, { name: nm }); },
      onUseExisting: (p) => openPortion(dayN, cat, p, {})
    });
  };
  document.getElementById('npSave').onclick = () => {
    const name = document.getElementById('npName').value.trim();
    if (!name) { toast('Geef een naam op', 'error'); return; }
    const unitName = document.getElementById('npUnitName').value.trim();
    const unitGrams = +document.getElementById('npUnitGrams').value || 0;
    const p = createProduct({
      name,
      kcalPer100g: +document.getElementById('npKcal').value || 0,
      pPer100g: +document.getElementById('npP').value || 0,
      cPer100g: +document.getElementById('npC').value || 0,
      fPer100g: +document.getElementById('npF').value || 0,
      unitName: unitName && unitGrams ? unitName : null,
      unitGrams: unitName && unitGrams ? unitGrams : null
    });
    openPortion(dayN, cat, p, {});
  };
}

// ---- Portie-invoer --------------------------------------------------------

// mode 'grams' of 'unit' (alleen als product een eenheid heeft).
function openPortion(dayN, cat, product, { editIndex = null, grams = null } = {}) {
  openSheet();
  const startGrams = grams != null ? grams : (product.lastGrams || 100);
  let unitMode = false;
  let value = startGrams;

  const render = () => {
    const hasUnit = !!(product.unitName && product.unitGrams);
    const gramsNow = unitMode ? (Number(value) || 0) * product.unitGrams : (Number(value) || 0);
    const m = macrosFor(product, gramsNow);
    sheetBody().innerHTML = `
      <div class="sheet-grip"></div>
      <div class="sheet-head">
        <h3>${escapeHtml(product.name)}</h3>
        <button class="sheet-close" id="sheetClose">✕</button>
      </div>
      <div class="portion">
        ${hasUnit ? `<div class="seg">
          <button class="${!unitMode ? 'active' : ''}" data-mode="grams">gram</button>
          <button class="${unitMode ? 'active' : ''}" data-mode="unit">${escapeHtml(product.unitName)}</button>
        </div>` : ''}
        <div class="portion-input">
          <input type="number" inputmode="decimal" id="portionVal" value="${value}">
          <span class="suffix">${unitMode ? escapeHtml(product.unitName) : 'g'}</span>
        </div>
        ${hasUnit && unitMode ? `<div class="portion-note">${round1(gramsNow)} g</div>` : ''}
        <div class="portion-preview">
          <div><span class="num">${Math.round(m.kcal)}</span><small>kcal</small></div>
          <div><span class="num">${round1(m.p)}</span><small>eiwit</small></div>
          <div><span class="num">${round1(m.c)}</span><small>koolh.</small></div>
          <div><span class="num">${round1(m.f)}</span><small>vet</small></div>
        </div>
        <button class="btn-primary" id="portionSave">${editIndex != null ? 'Opslaan' : 'Voeg toe'}</button>
        ${editIndex != null ? `<button class="danger-btn" id="portionDel">Verwijderen</button>` : ''}
      </div>`;

    document.getElementById('sheetClose').onclick = closeSheet;
    const input = document.getElementById('portionVal');
    input.oninput = () => { value = input.value; updatePreview(); };
    sheetBody().querySelectorAll('[data-mode]').forEach(b => {
      b.onclick = () => {
        const toUnit = b.dataset.mode === 'unit';
        if (toUnit === unitMode) return;
        // Behoud grammen bij wisselen van modus.
        const curGrams = unitMode ? value * product.unitGrams : value;
        unitMode = toUnit;
        value = unitMode ? round1(curGrams / product.unitGrams) : Math.round(curGrams);
        render();
      };
    });
    document.getElementById('portionSave').onclick = () => {
      const finalGrams = unitMode ? (Number(value) || 0) * product.unitGrams : (Number(value) || 0);
      if (finalGrams <= 0) { toast('Vul een portie in', 'error'); return; }
      if (editIndex != null) updateLogItem(dayN, cat, editIndex, finalGrams);
      else addLogItem(dayN, cat, product.id, finalGrams);
      tick(10);
      closeSheet();
      renderFood();
    };
    const del = document.getElementById('portionDel');
    if (del) del.onclick = () => {
      removeLogItem(dayN, cat, editIndex);
      tick(4);
      closeSheet();
      renderFood();
    };
    setTimeout(() => { input.focus(); input.select(); }, 60);
  };

  // Live preview zonder volledige re-render (snappier tijdens typen).
  const updatePreview = () => {
    const gramsNow = unitMode ? (Number(value) || 0) * product.unitGrams : (Number(value) || 0);
    const m = macrosFor(product, gramsNow);
    const prev = sheetBody().querySelector('.portion-preview');
    if (prev) prev.innerHTML = `
      <div><span class="num">${Math.round(m.kcal)}</span><small>kcal</small></div>
      <div><span class="num">${round1(m.p)}</span><small>eiwit</small></div>
      <div><span class="num">${round1(m.c)}</span><small>koolh.</small></div>
      <div><span class="num">${round1(m.f)}</span><small>vet</small></div>`;
    const note = sheetBody().querySelector('.portion-note');
    if (note) note.textContent = round1(gramsNow) + ' g';
  };

  render();
}

// ---- Maaltijd-menu (templates) --------------------------------------------

function openMealMenu(dayN, cat) {
  const label = MEAL_CATEGORIES.find(c => c.key === cat)?.label || cat;
  const items = state.foods[dayN][cat] || [];
  const templates = visibleTemplates(cat);
  openSheet();
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${label}</h3><button class="sheet-close" id="sheetClose">✕</button></div>
    <div class="menu-list">
      <button class="menu-row" id="mSave" ${items.length ? '' : 'disabled'}>Opslaan als template${items.length ? '' : ' (sectie leeg)'}</button>
      <button class="menu-row" id="mUse" ${templates.length ? '' : 'disabled'}>Template gebruiken${templates.length ? ` (${templates.length})` : ' (geen)'}</button>
    </div>`;
  document.getElementById('sheetClose').onclick = closeSheet;
  document.getElementById('mSave').onclick = () => openSaveTemplate(dayN, cat);
  document.getElementById('mUse').onclick = () => openTemplatePicker(dayN, cat);
}

function openSaveTemplate(dayN, cat) {
  const label = MEAL_CATEGORIES.find(c => c.key === cat)?.label || cat;
  const items = state.foods[dayN][cat] || [];
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Opslaan als template</h3><button class="sheet-close" id="sheetClose">✕</button></div>
    <div class="new-form">
      <label>Naam</label>
      <input type="text" id="tplName" placeholder="bv. Standaard ${label.toLowerCase()}">
      <div class="tpl-preview">${items.map(it => {
        const p = getProduct(it.productId);
        return `<div>${escapeHtml(p ? p.name : '?')} <span class="grams">${fmtGrams(p, it.grams)}</span></div>`;
      }).join('')}</div>
      <button class="btn-primary" id="tplSave">Opslaan</button>
    </div>`;
  document.getElementById('sheetClose').onclick = closeSheet;
  document.getElementById('tplName').focus();
  document.getElementById('tplSave').onclick = () => {
    const name = document.getElementById('tplName').value.trim();
    if (!name) { toast('Geef een naam op', 'error'); return; }
    saveTemplate(name, cat, items);
    closeSheet();
    toast('Template opgeslagen', 'success');
  };
}

function openTemplatePicker(dayN, cat) {
  const templates = visibleTemplates(cat);
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Template gebruiken</h3><button class="sheet-close" id="sheetClose">✕</button></div>
    <div class="sheet-list">${templates.map(t => {
      let kcal = 0;
      t.items.forEach(it => { const p = getProduct(it.productId); if (p) kcal += macrosFor(p, it.grams).kcal; });
      return `<div class="prod-row" data-tpl="${t.id}">
        <div class="food-info">
          <div class="food-name">${escapeHtml(t.name)}</div>
          <div class="food-macros">${t.items.length} producten · ${Math.round(kcal)} kcal</div>
        </div>
        <span class="prod-add">+</span>
      </div>`;
    }).join('')}</div>`;
  document.getElementById('sheetClose').onclick = closeSheet;
  sheetBody().querySelectorAll('[data-tpl]').forEach(row => {
    row.onclick = () => {
      const added = applyTemplate(dayN, cat, row.dataset.tpl);
      closeSheet();
      renderFood();
      toast(`${added} producten toegevoegd`, 'success');
    };
  });
}

// ---- Bibliotheek-beheer (vanuit Settings) ---------------------------------

export function openLibraryManager() {
  searchQuery = '';
  openSheet();
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Productbibliotheek</h3><button class="sheet-close" id="sheetClose">✕</button></div>
    <input class="sheet-search" id="libSearch" type="search" inputmode="search" placeholder="Zoek product…">
    <button class="menu-row" id="libNew">+ Nieuw product</button>
    <div class="sheet-list" id="libList"></div>`;
  document.getElementById('sheetClose').onclick = closeSheet;
  document.getElementById('libNew').onclick = () => openProductEditor(null);
  const search = document.getElementById('libSearch');
  search.oninput = () => { searchQuery = search.value; renderLibList(); };
  renderLibList();
}

function renderLibList() {
  const list = document.getElementById('libList');
  if (!list) return;
  const q = searchQuery.trim().toLowerCase();
  const products = visibleProducts()
    .filter(p => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'nl'));

  if (!products.length) { list.innerHTML = `<div class="sheet-empty">Geen producten.</div>`; return; }

  list.innerHTML = products.map(p => `
    <div class="lib-row" data-id="${p.id}">
      <div class="food-info">
        <div class="food-name">${escapeHtml(p.name)} ${p.seed ? '<span class="badge">seed</span>' : ''}</div>
        <div class="food-macros">${Math.round(p.kcalPer100g)} kcal · P${round1(p.pPer100g)} C${round1(p.cPer100g)} F${round1(p.fPer100g)} /100g</div>
      </div>
      <div class="lib-actions">
        <button class="fav ${p.isFavorite ? 'on' : ''}" data-fav="${p.id}" aria-label="Favoriet">★</button>
        <button data-editp="${p.id}" aria-label="Bewerk">✎</button>
        <button data-delp="${p.id}" aria-label="Verwijder">✕</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { toggleFavorite(b.dataset.fav); renderLibList(); });
  list.querySelectorAll('[data-editp]').forEach(b => b.onclick = () => openProductEditor(getProduct(b.dataset.editp)));
  list.querySelectorAll('[data-delp]').forEach(b => b.onclick = () => {
    const p = getProduct(b.dataset.delp);
    if (!confirm(`"${p.name}" verwijderen?`)) return;
    const res = removeProduct(p.id);
    toast(res === 'hidden' ? 'Verborgen (nog in logs gebruikt)' : 'Verwijderd', 'success');
    renderLibList();
  });
}

// product=null -> nieuw product (alleen aanmaken, niet loggen). prefill vult
// bij een nieuw product de velden voor (bv. na een macro-lookup).
function openProductEditor(product, prefill = null) {
  const p = product || prefill || {};
  const nameField = product
    ? `<input type="text" id="epName" value="${escapeAttr(p.name || '')}" placeholder="bv. Magere kwark">`
    : `<div class="lk-name-row">
        <input type="text" id="epName" value="${escapeAttr(p.name || '')}" placeholder="bv. Magere kwark">
        <button type="button" class="lk-find" id="epLookup">🔎 Zoek macro's</button>
      </div>`;
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${product ? 'Bewerk product' : 'Nieuw product'}</h3><button class="sheet-close" id="sheetClose">✕</button></div>
    <div class="new-form">
      <label>Naam</label>
      ${nameField}
      <label>Per 100 g</label>
      <div class="grid4">
        <input type="number" inputmode="decimal" id="epKcal" value="${p.kcalPer100g ?? ''}" placeholder="kcal">
        <input type="number" inputmode="decimal" id="epP" value="${p.pPer100g ?? ''}" placeholder="P">
        <input type="number" inputmode="decimal" id="epC" value="${p.cPer100g ?? ''}" placeholder="C">
        <input type="number" inputmode="decimal" id="epF" value="${p.fPer100g ?? ''}" placeholder="F">
      </div>
      <label class="opt">Optionele eenheid (bv. "ei" = 50 g)</label>
      <div class="grid2">
        <input type="text" id="epUnitName" value="${escapeAttr(p.unitName || '')}" placeholder="naam eenheid">
        <input type="number" inputmode="decimal" id="epUnitGrams" value="${p.unitGrams ?? ''}" placeholder="gram per stuk">
      </div>
      <button class="btn-primary" id="epSave">${product ? 'Opslaan' : 'Aanmaken'}</button>
    </div>`;
  document.getElementById('sheetClose').onclick = closeSheet;
  if (!product && !prefill) document.getElementById('epName').focus();
  if (!product) document.getElementById('epLookup').onclick = () => {
    const nm = document.getElementById('epName').value.trim();
    startMacroLookup({
      name: nm,
      onConfirm: (fields) => {
        createProduct({ ...productFromFields(fields), source: 'llm' });
        openLibraryManager();
        toast('Product aangemaakt', 'success');
      },
      onEdit: (fields) => openProductEditor(null, fields),
      onCancel: () => openProductEditor(null, { name: nm }),
      onUseExisting: (existing) => openProductEditor(existing)
    });
  };
  document.getElementById('epSave').onclick = () => {
    const name = document.getElementById('epName').value.trim();
    if (!name) { toast('Geef een naam op', 'error'); return; }
    const unitName = document.getElementById('epUnitName').value.trim();
    const unitGrams = +document.getElementById('epUnitGrams').value || 0;
    const fields = {
      name,
      kcalPer100g: +document.getElementById('epKcal').value || 0,
      pPer100g: +document.getElementById('epP').value || 0,
      cPer100g: +document.getElementById('epC').value || 0,
      fPer100g: +document.getElementById('epF').value || 0,
      unitName: unitName && unitGrams ? unitName : null,
      unitGrams: unitName && unitGrams ? unitGrams : null
    };
    if (product) updateProduct(product.id, fields);
    else createProduct(fields);
    openLibraryManager();
    toast(product ? 'Opgeslagen' : 'Product aangemaakt', 'success');
  };
}

export function openTemplatesManager() {
  openSheet();
  const templates = visibleTemplates();
  const labelOf = (k) => MEAL_CATEGORIES.find(c => c.key === k)?.label || k;
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Templates</h3><button class="sheet-close" id="sheetClose">✕</button></div>
    <div class="sheet-list">${templates.length ? templates.map(t => `
      <div class="lib-row" data-tid="${t.id}">
        <div class="food-info">
          <div class="food-name">${escapeHtml(t.name)}</div>
          <div class="food-macros">${labelOf(t.category)} · ${t.items.length} producten</div>
        </div>
        <div class="lib-actions"><button data-deltpl="${t.id}" aria-label="Verwijder">✕</button></div>
      </div>`).join('') : '<div class="sheet-empty">Nog geen templates. Maak ze via het ⋯-menu bij een maaltijd.</div>'}</div>`;
  document.getElementById('sheetClose').onclick = closeSheet;
  sheetBody().querySelectorAll('[data-deltpl]').forEach(b => b.onclick = () => {
    deleteTemplate(b.dataset.deltpl);
    openTemplatesManager();
    toast('Template verwijderd', 'success');
  });
}

// ---- Auto macro-lookup (gedeeld door beide nieuw-product-formulieren) ------

// Start de lookup-flow vanuit een formulier. De callbacks bepalen het
// per-formulier gedrag; deze helper doet de duplicaat-check, laadstatus, fetch,
// preview en knop-wiring. Alles speelt zich af in de bestaande sheet.
//   onConfirm(fields)      -> sla direct op  (fields = {name,kcalPer100g,pPer100g,cPer100g,fPer100g})
//   onEdit(fields)         -> heropen formulier voorgevuld met fields
//   onCancel()             -> terug naar formulier (naam behouden)
//   onUseExisting(product) -> gebruik bestaand product (bij duplicaat)
function startMacroLookup({ name, onConfirm, onEdit, onCancel, onUseExisting }) {
  const ctx = { name: String(name || '').trim(), onConfirm, onEdit, onCancel, onUseExisting };
  if (!ctx.name) { toast('Geef eerst een naam op', 'error'); return; }

  // Duplicaat: exact dezelfde naam (case-insensitive) al in de bibliotheek?
  const key = ctx.name.toLowerCase();
  const dup = visibleProducts().find(p => p.name.trim().toLowerCase() === key);
  if (dup) { renderDuplicate(dup, ctx); return; }

  runLookup(ctx);
}

function renderDuplicate(dup, ctx) {
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Bestaat al</h3><button class="sheet-close" id="lkClose">✕</button></div>
    <div class="lk-dup">
      <p>Dit product bestaat al — gebruiken?</p>
      <div class="prod-row static">
        <div class="food-info">
          <div class="food-name">${escapeHtml(dup.name)}</div>
          <div class="food-macros">${Math.round(dup.kcalPer100g)} kcal · P${round1(dup.pPer100g)} C${round1(dup.cPer100g)} F${round1(dup.fPer100g)} /100g</div>
        </div>
      </div>
      <div class="vr-confirm">
        <button class="btn-ghost" id="lkNew">Toch nieuw zoeken</button>
        <button class="btn-ghost" id="lkCancel">Annuleer</button>
        <button class="btn-primary" id="lkUse">Gebruik bestaand</button>
      </div>
    </div>`;
  document.getElementById('lkClose').onclick = closeSheet;
  document.getElementById('lkUse').onclick = () => ctx.onUseExisting(dup);
  document.getElementById('lkNew').onclick = () => runLookup(ctx);
  document.getElementById('lkCancel').onclick = () => ctx.onCancel();
}

async function runLookup(ctx) {
  renderLookupLoading(ctx.name);
  let res;
  try {
    res = await lookupMacros(ctx.name);
  } catch (e) {
    // Netwerk/API-fout → eerlijke melding + terug naar handmatig (naam behouden).
    toast(e?.message || 'Auto-lookup mislukt, voer handmatig in.', 'error');
    ctx.onCancel();
    return;
  }
  renderLookupPreview(res, ctx);
}

function renderLookupLoading(name) {
  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="voice-rec">
      <div class="vr-spinner"></div>
      <div class="vr-hint">Macro's opzoeken…</div>
      <div class="vr-sub">${escapeHtml(name)}</div>
    </div>`;
}

function renderLookupPreview(res, ctx) {
  const fields = {
    name: (res.name || ctx.name),
    kcalPer100g: Math.round(Number(res.kcalPer100g) || 0),
    pPer100g: Number(res.pPer100g) || 0,
    cPer100g: Number(res.cPer100g) || 0,
    fPer100g: Number(res.fPer100g) || 0
  };
  const conf = clamp01(Number(res.confidence));

  sheetBody().innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${escapeHtml(fields.name)}</h3><button class="sheet-close" id="lkClose">✕</button></div>
    <div class="lk-preview">
      <div class="lk-per">Per 100 g</div>
      <div class="lk-macros">
        <div><span class="num">${fields.kcalPer100g}</span><small>kcal</small></div>
        <div><span class="num">${round1(fields.pPer100g)}</span><small>eiwit</small></div>
        <div><span class="num">${round1(fields.cPer100g)}</span><small>koolh.</small></div>
        <div><span class="num">${round1(fields.fPer100g)}</span><small>vet</small></div>
      </div>
      ${confidenceHtml(conf)}
      ${res.notes ? `<div class="lk-notes">${escapeHtml(res.notes)}</div>` : ''}
    </div>
    <div class="vr-confirm">
      <button class="btn-ghost" id="lkEdit">Aanpassen</button>
      <button class="btn-ghost" id="lkCancel">Annuleer</button>
      <button class="btn-primary" id="lkAdd">Toevoegen</button>
    </div>`;
  document.getElementById('lkClose').onclick = closeSheet;
  document.getElementById('lkAdd').onclick = () => ctx.onConfirm(fields);
  document.getElementById('lkEdit').onclick = () => ctx.onEdit(fields);
  document.getElementById('lkCancel').onclick = () => ctx.onCancel();
}

// Confidence-indicator: 4 bolletjes + kleur + korte tekst per drempel (brief).
function confidenceHtml(conf) {
  const pct = Math.round(conf * 100);
  const filled = Math.max(1, Math.min(4, Math.round(conf * 4)));
  let cls, warn;
  if (conf >= 0.85)      { cls = 'good'; warn = ''; }
  else if (conf >= 0.65) { cls = 'warn'; warn = 'Schatting — controleer indien specifiek merk.'; }
  else                   { cls = 'bad';  warn = 'Lage zekerheid — overweeg handmatig invoeren.'; }

  let dots = '';
  for (let i = 0; i < 4; i++) dots += `<span class="lk-dot ${i < filled ? 'on ' + cls : ''}"></span>`;
  return `<div class="lk-conf">
      <div class="lk-dots">${dots}<span class="lk-pct">Zekerheid ${pct}%</span></div>
      ${warn ? `<div class="lk-warn ${cls}">${warn}</div>` : ''}
    </div>`;
}

// Macro-velden → product-payload voor createProduct (zonder eenheid; die voegt
// Peter desgewenst handmatig toe).
function productFromFields(f) {
  return {
    name: f.name,
    kcalPer100g: +f.kcalPer100g || 0,
    pPer100g: +f.pPer100g || 0,
    cPer100g: +f.cPer100g || 0,
    fPer100g: +f.fPer100g || 0,
    unitName: null,
    unitGrams: null
  };
}

function clamp01(x) { return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0; }

// Matchkwaliteit van een productnaam tegen query `q` (lowercase). Lager = beter;
// -1 = geen match. Gebruikt door de gerankte productzoekfunctie (#28).
function matchRank(name, q) {
  const n = String(name).toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.split(/[^a-z0-9]+/).some(w => w && w.startsWith(q))) return 2;
  if (n.includes(q)) return 3;
  return -1;
}

// ---- Helpers --------------------------------------------------------------

function fmtGrams(product, grams) {
  if (product?.unitName && product.unitGrams) {
    const u = grams / product.unitGrams;
    // Toon eenheid als het ongeveer een heel/half veelvoud is.
    if (Math.abs(u - Math.round(u * 2) / 2) < 0.05) {
      const n = Math.round(u * 2) / 2;
      return `${n} ${product.unitName} (${Math.round(grams)}g)`;
    }
  }
  return `${Math.round(grams)}g`;
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

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}
