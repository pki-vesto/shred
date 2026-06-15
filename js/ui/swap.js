// Exercise-swap bottom-sheet. Opent vanuit de Vandaag-tab (tik op een
// oefeningsnaam) en toont de varianten in dezelfde categorie. Knievriendelijke
// oefeningen staan bovenaan (zie exercises.variantsFor). Eén tik = wisselen:
// de keuze wordt opgeslagen in state.slotChoices voor deze dag, en optioneel
// (toggle) als standaard voor dit slot in state.slotDefaults.

import { state, mutate } from '../state.js';
import { openSheet, closeSheet, sheetBody } from './sheet.js';
import { variantsFor, categoryLabel, equipmentFor } from '../exercises.js';
import { lastDoneDay, bestSet, shortDate } from '../helpers.js';
import { tick, toast } from './components.js';

export function openSwapSheet({ day, slot, activeExId, onChange }) {
  let active = activeExId;
  openSheet();
  render();

  function render() {
    const variants = variantsFor(slot.category, state.favoriteExercises || {});
    const rememberOn = state.slotDefaults?.[slot.id] === active;
    const rows = variants.map(rowHtml).join('');
    sheetBody().innerHTML = `
      <div class="sheet-grip"></div>
      <div class="sheet-head">
        <h3>Wissel oefening</h3>
        <button class="sheet-close" id="swClose">✕</button>
      </div>
      <div class="swap-cat">${escapeHtml(categoryLabel(slot.category))}</div>
      <div class="sheet-list swap-list">${rows}</div>
      <label class="swap-default">
        <input type="checkbox" id="swRemember" ${rememberOn ? 'checked' : ''}>
        <span>Onthoud als standaard voor dit slot</span>
      </label>`;
    document.getElementById('swClose').onclick = closeSheet;
    sheetBody().querySelectorAll('[data-pick]').forEach(b => {
      b.onclick = () => pick(b.dataset.pick);
    });
    sheetBody().querySelectorAll('[data-fav]').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); toggleFavorite(b.dataset.fav); };
      b.onkeydown = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(b.dataset.fav);
      };
    });
  }

  function rowHtml(v) {
    const isActive = v.id === active;
    const isFav = !!state.favoriteExercises?.[v.id];
    const seen = lastDoneDay(v.id);
    const best = bestSet(v.id);
    const knee = v.knee_safe
      ? '<span class="swap-knee ok" title="Knievriendelijk">✓</span>'
      : '<span class="swap-knee bad" title="Belast de rechterknie">⚠</span>';
    const lastTxt = seen ? `laatst: dag ${seen} · ${escapeHtml(shortDate(seen))}` : 'nog niet gedaan';
    const bestTxt = best ? ` · <span class="swap-best">best ${best.w} kg × ${best.r}</span>` : '';
    const equip = equipmentFor(v);
    const favLabel = isFav ? 'Verwijder uit favoriete swaps' : 'Markeer als favoriete swap';
    return `<button class="swap-row${isActive ? ' active' : ''}${v.knee_safe ? '' : ' unsafe'}" data-pick="${v.id}">
      <span class="swap-dot">${isActive ? '●' : ''}</span>
      <span class="swap-body">
        <span class="swap-name">${escapeHtml(v.name)} ${knee}${equip ? ` <span class="ex-equip">${escapeHtml(equip)}</span>` : ''}</span>
        <span class="swap-sub">${lastTxt}${bestTxt}</span>
        ${v.notes ? `<span class="swap-note">${escapeHtml(v.notes)}</span>` : ''}
      </span>
      <span class="swap-fav${isFav ? ' on' : ''}" data-fav="${v.id}" role="button" tabindex="0" title="${favLabel}" aria-label="${favLabel}">${isFav ? '★' : '☆'}</span>
    </button>`;
  }

  function toggleFavorite(exId) {
    state.favoriteExercises = state.favoriteExercises || {};
    if (state.favoriteExercises[exId]) delete state.favoriteExercises[exId];
    else state.favoriteExercises[exId] = true;
    mutate('meta', 'favoriteExercises');
    tick(8);
    render();
  }

  function pick(exId) {
    active = exId;
    // Sessie-keuze voor deze dag. De schema-default vraagt geen expliciete
    // keuze — die ruimen we op zodat slotChoices schoon blijft.
    state.slotChoices[day] = state.slotChoices[day] || {};
    if (exId === slot.default) {
      delete state.slotChoices[day][slot.id];
      if (!Object.keys(state.slotChoices[day]).length) delete state.slotChoices[day];
    } else {
      state.slotChoices[day][slot.id] = exId;
    }
    mutate('slot_choices', String(day));

    // Optioneel: onthoud deze keuze als standaard voor dit slot.
    if (document.getElementById('swRemember')?.checked) {
      state.slotDefaults[slot.id] = exId;
      mutate('meta', 'slotDefaults');
    }

    tick(12);
    onChange?.();
    closeSheet();
    if (exId !== slot.default) toast('Oefening gewisseld');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
