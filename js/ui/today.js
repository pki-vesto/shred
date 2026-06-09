import { state, mutate } from '../state.js';
import { SESSIONS, sessionFor } from '../sessions.js';
import { dateForDay, formatDate, weekOf, isHardcodedDeload, isCurrentWeekDeload, TOTAL_DAYS, todayNum, dayIsComplete, resolveSlots, getLastSession, volumeTrend, shortDate } from '../helpers.js';
import { renderTopbar, toast, progressRing, popCheck, celebrate, tick, CHECK_SVG } from './components.js';
import { openSwapSheet } from './swap.js';
import { exerciseSummary, prForSet, sessionSummary } from '../trainingMetrics.js';

const KICKERS = { training: 'Krachttraining', cardio: 'Cardio', rest: 'Herstel' };
const REFRESH_SVG = '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/></svg>';
const CHEVRON_SVG = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const SWAP_SVG = '<svg viewBox="0 0 24 24"><path d="M4 7h13l-3-3M20 17H7l3 3"/></svg>';

export function renderToday() {
  const n = state.viewDay;
  const date = dateForDay(n);
  const code = sessionFor(date);
  const sess = SESSIONS[code];
  const deload = isCurrentWeekDeload();

  document.getElementById('dayNum').textContent = n;
  document.getElementById('dayDate').textContent = formatDate(date);
  document.getElementById('prevDay').disabled = (n <= 1);
  document.getElementById('nextDay').disabled = (n >= TOTAL_DAYS);
  document.getElementById('todayBtn').style.visibility = (n === todayNum()) ? 'hidden' : 'visible';

  const items = sess.type === 'training' ? resolveSlots(sess, n) : [];

  let ring = '';
  if (sess.type === 'training') {
    const done = items.filter((_, i) => state.completed[n]?.['ex' + i]).length;
    ring = `<div class="sess-progress"><span class="ring">${progressRing(done, items.length)}</span></div>`;
  }

  let html = `<div class="session-card ${sess.type}${deload ? ' deload' : ''}">
    <div class="session-head">
      <div>
        <div class="session-kicker"><span class="tag"></span>${KICKERS[sess.type]}</div>
        <h2>${sess.title}</h2>
        <div class="subtitle">${sess.subtitle}</div>
      </div>
      ${deload ? '<span class="deload-badge">Deload</span>' : ring}
    </div>`;

  if (sess.type === 'training') {
    html += '<div class="training-summary" id="trainingSummary"></div>';
    html += '<ul class="ex-list">';
    items.forEach((ex, i) => {
      const done = state.completed[n]?.['ex' + i] === true;
      const last = getLastSession(ex.exId, n);
      html += `<li class="ex-item ${done ? 'done' : ''}" data-ex-idx="${i}" data-ex-id="${ex.exId}" data-slot-id="${ex.slotId}">
        <div class="ex-head">
          <div class="ex-check" data-toggle-done="1"><span class="check-ring"></span>${CHECK_SVG}</div>
          <div class="ex-info">
            <button class="ex-name ex-swap" data-swap="${i}">
              <span class="exn-text">${ex.name}</span>
              ${ex.isSwapped ? `<span class="swap-flag" title="Afwijkend van standaard">${SWAP_SVG}</span>` : ''}
              <span class="exn-chev">${CHEVRON_SVG}</span>
            </button>
            <div class="ex-meta"><span class="ex-sr">${ex.sr}</span> · rust ${ex.rest}${ex.equipment ? ` <span class="ex-equip">${ex.equipment}</span>` : ''}</div>
            ${lastLineHtml(ex, last, n)}
          </div>
          <button class="ex-toggle" data-toggle-log="1">Log</button>
        </div>
        <div class="sets-log" id="log-${i}">
          <div class="set-headers"><span>Set</span><span>Kg</span><span>Reps</span><span>RIR</span><span></span></div>
          <div id="setrows-${i}"></div>
          <div class="set-actions">
            <button class="set-add" data-add-set="${i}">+ Set toevoegen</button>
            ${last ? `<button class="set-repeat" data-repeat="${i}">${REFRESH_SVG}Vorige</button>` : ''}
          </div>
          <textarea class="ex-day-note" data-ex-note="${i}" rows="1" placeholder="Notitie voor deze oefening vandaag">${exerciseNoteValue(ex.exId, n)}</textarea>
          <div class="ex-volume-line" id="exvol-${i}"></div>
          ${ex.notes ? `<div class="ex-note-line">${ex.notes}</div>` : ''}
        </div>
      </li>`;
    });
    html += '</ul>';
    if (deload) html += '<div class="deload-note">Deload-week — volume −30/40%, niet tot falen. Herstel is het werk.</div>';
  } else if (sess.type === 'cardio') {
    const done = state.completed[n]?.cardio === true;
    html += `<div class="cardio-content">${sess.body}</div>
      <div class="cardio-options">${sess.options}</div>
      <ul class="ex-list single-check"><li class="ex-item ${done ? 'done' : ''}" data-cardio="1">
        <div class="ex-head"><div class="ex-check"><span class="check-ring"></span>${CHECK_SVG}</div>
        <div class="ex-info"><div class="ex-name">Sessie voltooid</div></div></div>
      </li></ul>`;
  } else {
    const done = state.completed[n]?.rest === true;
    html += `<div class="rest-content"><div class="moon">🌙</div>${sess.body}</div>
      <ul class="ex-list single-check"><li class="ex-item ${done ? 'done' : ''}" data-rest="1">
        <div class="ex-head"><div class="ex-check"><span class="check-ring"></span>${CHECK_SVG}</div>
        <div class="ex-info"><div class="ex-name">Rust genomen</div></div></div>
      </li></ul>`;
  }
  html += '</div>';

  document.getElementById('sessionContainer').innerHTML = html;
  bindTodayEvents(n, sess, items);
  renderSetRows(n, sess, items);
  renderTrainingSummary(n, items);

  const notes = document.getElementById('notes');
  notes.value = state.notes[n] || '';
  notes.oninput = () => { state.notes[n] = notes.value; mutate('day_log', String(n)); };
}

const TREND = { up: '↑', down: '↓', flat: '→' };
const TREND_LABEL = { up: 'omhoog t.o.v. vorige sessies', down: 'omlaag t.o.v. vorige sessies', flat: 'gelijk aan vorige sessies' };

// De compacte "vorige sessie"-regel onder de oefeningsnaam. Tikbaar om alle
// set-inputs ineens te vullen met de vorige waarden (zie [data-autofill]).
function lastLineHtml(ex, last, n) {
  if (!last) return `<div class="ex-last empty">Eerste sessie — geen referentie</div>`;
  const trend = volumeTrend(ex.exId, n);
  const trendHtml = trend
    ? `<span class="ex-trend ${trend}" title="${TREND_LABEL[trend]}">${TREND[trend]}</span>` : '';
  return `<button class="ex-last" data-autofill="${ex.idx}">
    <span class="exl-text">Vorige (${shortDate(last.day)}): ${formatSets(last.sets)}</span>
    ${trendHtml}
    <span class="exl-ico">${REFRESH_SVG}</span>
  </button>`;
}

function updateSessRing(n, sess) {
  const wrap = document.querySelector('.sess-progress .ring');
  if (!wrap || sess.type !== 'training') return;
  const total = sess.slots.length;
  const done = sess.slots.filter((_, i) => state.completed[n]?.['ex' + i]).length;
  wrap.innerHTML = progressRing(done, total);
}

function celebrateIfComplete(n) {
  if (!dayIsComplete(n)) return;
  celebrate();
  toast('Dag voltooid 🔥', 'success');
  tick(40);
}

function bindTodayEvents(n, sess, items) {
  document.querySelectorAll('[data-toggle-done]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const item = el.closest('.ex-item');
      const i = item.dataset.exIdx;
      state.completed[n] = state.completed[n] || {};
      const nowDone = !state.completed[n]['ex' + i];
      state.completed[n]['ex' + i] = nowDone;
      tick(nowDone ? 10 : 4);
      mutate('day_log', String(n));
      item.classList.toggle('done', nowDone);
      if (nowDone) popCheck(el);
      updateSessRing(n, sess);
      renderTopbar();
      if (nowDone) celebrateIfComplete(n);
    };
  });

  document.querySelectorAll('[data-toggle-log]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const i = btn.closest('.ex-item').dataset.exIdx;
      const log = document.getElementById('log-' + i);
      const open = log.classList.toggle('open');
      btn.classList.toggle('open', open);
    };
  });

  document.querySelectorAll('[data-cardio]').forEach(el => {
    el.onclick = () => {
      state.completed[n] = state.completed[n] || {};
      const nd = !state.completed[n].cardio;
      state.completed[n].cardio = nd;
      tick(nd ? 20 : 4);
      mutate('day_log', String(n));
      el.classList.toggle('done', nd);
      if (nd) popCheck(el.querySelector('.ex-check'));
      renderTopbar();
      if (nd) celebrateIfComplete(n);
    };
  });

  document.querySelectorAll('[data-rest]').forEach(el => {
    el.onclick = () => {
      state.completed[n] = state.completed[n] || {};
      const nd = !state.completed[n].rest;
      state.completed[n].rest = nd;
      tick(nd ? 20 : 4);
      mutate('day_log', String(n));
      el.classList.toggle('done', nd);
      if (nd) popCheck(el.querySelector('.ex-check'));
      renderTopbar();
      if (nd) celebrateIfComplete(n);
    };
  });

  document.querySelectorAll('[data-add-set]').forEach(btn => {
    btn.onclick = () => {
      const i = btn.dataset.addSet;
      const exId = items[i].exId;
      const sessLog = ensureTodaySetLog(exId, n);
      const last = getLastSession(exId, n);
      const idx = sessLog.sets.length;
      // Pre-fill from the previous session's same-index set (weight + reps);
      // RIR start altijd leeg.
      const suggest = last && last.sets[idx]
        ? { w: last.sets[idx].w, r: last.sets[idx].r || '', rir: '' }
        : { w: '', r: '', rir: '' };
      sessLog.sets.push(suggest);
      mutate('sets', `${exId}:${n}`);
      renderSetRows(n, sess, items);
      renderTrainingSummary(n, items);
    };
  });

  // Neem de vorige sessie volledig over (juiste aantal sets). Wordt zowel door
  // de "Vorige"-regel (data-autofill) als de "Vorige"-knop (data-repeat)
  // gebruikt. Vraagt bevestiging als er vandaag al iets is ingevuld.
  function adoptPrevious(i, srcEl) {
    const exId = items[i].exId;
    const last = getLastSession(exId, n);
    if (!last) return;
    const sessLog = ensureTodaySetLog(exId, n);
    const hasValues = sessLog.sets.some(s => s.w || s.r);
    if (hasValues && !confirm('Je hebt vandaag al sets ingevuld. Overschrijven met je vorige sessie?')) return;
    sessLog.sets = last.sets.map(s => ({ w: s.w, r: s.r, rir: '' }));
    mutate('sets', `${exId}:${n}`);
    // Zorg dat het log-paneel open staat zodat de ingevulde rijen zichtbaar zijn.
    const li = document.querySelector(`.ex-item[data-ex-idx="${i}"]`);
    if (li) {
      li.querySelector('.sets-log')?.classList.add('open');
      li.querySelector('[data-toggle-log]')?.classList.add('open');
    }
    renderSetRows(n, sess, items);
    renderTrainingSummary(n, items);
    tick(15);
    if (srcEl) popCheck(srcEl);
    toast('Vorige sessie overgenomen', 'success');
  }

  document.querySelectorAll('[data-autofill]').forEach(btn => {
    btn.onclick = (e) => { e.stopPropagation(); adoptPrevious(+btn.dataset.autofill, btn); };
  });

  document.querySelectorAll('[data-repeat]').forEach(btn => {
    btn.onclick = () => adoptPrevious(+btn.dataset.repeat, btn);
  });

  // Oefeningsnaam tikbaar → swap-sheet met varianten in dezelfde categorie.
  document.querySelectorAll('[data-swap]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const i = +btn.dataset.swap;
      openSwapSheet({
        day: n,
        slot: sess.slots[i],
        activeExId: items[i].exId,
        onChange: () => { renderToday(); }
      });
    };
  });

  document.querySelectorAll('[data-ex-note]').forEach(note => {
    note.oninput = () => {
      const i = +note.dataset.exNote;
      const exId = items[i].exId;
      state.exerciseNotes[exId] = state.exerciseNotes[exId] || {};
      if (note.value) state.exerciseNotes[exId][n] = note.value;
      else delete state.exerciseNotes[exId][n];
      mutate('exercise_notes', `${exId}:${n}`);
    };
  });
}

function ensureTodaySetLog(exId, day) {
  state.sets[exId] = state.sets[exId] || [];
  let entry = state.sets[exId].find(s => s.day === day);
  if (!entry) {
    entry = { day, sets: [] };
    state.sets[exId].push(entry);
    state.sets[exId].sort((a, b) => a.day - b.day);
  }
  return entry;
}

function formatSets(sets) {
  return sets.filter(s => s.w && s.r).map(s => `${s.w} × ${s.r}`).join(' · ');
}

function exerciseNoteValue(exId, day) {
  return escapeHtml(state.exerciseNotes?.[exId]?.[day] || '');
}

function renderSetRows(n, sess, items) {
  if (sess.type !== 'training') return;
  items.forEach((ex, i) => {
    const entry = state.sets[ex.exId]?.find(s => s.day === n);
    const container = document.getElementById('setrows-' + i);
    if (!container) return;
    if (!entry || !entry.sets.length) {
      container.innerHTML = '<div class="sets-empty">Nog geen sets. Tik "+ Set" of neem je vorige sessie over.</div>';
      return;
    }
    container.innerHTML = entry.sets.map((s, j) => {
      const pr = prForSet(ex.exId, n, s);
      return `
      <div class="set-row ${pr ? 'is-pr' : ''}">
        <span class="lbl">${j + 1}${pr ? `<small>${pr.label}</small>` : ''}</span>
        <div class="field"><input type="number" step="0.5" inputmode="decimal" placeholder="kg" value="${escapeAttr(s.w)}" data-set="${i}-${j}-w"></div>
        <div class="field"><input type="number" inputmode="numeric" placeholder="reps" value="${escapeAttr(s.r)}" data-set="${i}-${j}-r"></div>
        <div class="field rir-field">
          <select data-set="${i}-${j}-rir" aria-label="RIR set ${j + 1}">
            <option value="" ${s.rir === undefined || s.rir === '' ? 'selected' : ''}>-</option>
            ${[0, 1, 2, 3, 4, 5].map(v => `<option value="${v}" ${String(s.rir) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <button class="del" data-del-set="${i}-${j}">✕</button>
      </div>
    `; }).join('');

    container.querySelectorAll('input[data-set]').forEach(inp => {
      inp.oninput = () => {
        const [ii, jj, field] = inp.dataset.set.split('-');
        const exId = items[ii].exId;
        const e = state.sets[exId].find(s => s.day === n);
        e.sets[jj][field] = inp.value;
        mutate('sets', `${exId}:${n}`);
        renderExerciseSummary(ii, exId, n);
        renderTrainingSummary(n, items);
      };
      inp.onchange = () => renderSetRows(n, sess, items);
    });
    container.querySelectorAll('select[data-set]').forEach(sel => {
      sel.onchange = () => {
        const [ii, jj, field] = sel.dataset.set.split('-');
        const exId = items[ii].exId;
        const e = state.sets[exId].find(s => s.day === n);
        e.sets[jj][field] = sel.value;
        mutate('sets', `${exId}:${n}`);
      };
    });
    container.querySelectorAll('[data-del-set]').forEach(b => {
      b.onclick = () => {
        const [ii, jj] = b.dataset.delSet.split('-');
        const exId = items[ii].exId;
        const e = state.sets[exId].find(s => s.day === n);
        e.sets.splice(jj, 1);
        mutate('sets', `${exId}:${n}`);
        renderSetRows(n, sess, items);
        renderTrainingSummary(n, items);
      };
    });
    renderExerciseSummary(i, ex.exId, n);
  });
}

function renderExerciseSummary(i, exId, day) {
  const target = document.getElementById('exvol-' + i);
  if (!target) return;
  const entry = state.sets[exId]?.find(s => s.day === day);
  const sum = exerciseSummary(exId, entry);
  if (!sum.sets) {
    target.textContent = '';
    return;
  }
  target.innerHTML = `<span>${Math.round(sum.volume)} kg volume</span><span>${sum.sets} sets</span>${sum.topLabel ? `<span>top ${sum.topLabel}</span>` : ''}`;
}

function renderTrainingSummary(day, items) {
  const target = document.getElementById('trainingSummary');
  if (!target) return;
  const sum = sessionSummary(items, day);
  const groups = Object.entries(sum.byGroup)
    .sort((a, b) => b[1] - a[1])
    .map(([group, volume]) => `<span>${group}: ${Math.round(volume)}</span>`)
    .join('');
  target.innerHTML = `
    <div><b>${Math.round(sum.totalVolume)}</b><span>kg volume</span></div>
    <div><b>${sum.completeSets}</b><span>sets</span></div>
    <div><b>${sum.prCount}</b><span>PRs</span></div>
    ${groups ? `<div class="ts-groups">${groups}</div>` : '<div class="ts-groups"><span>Nog geen sets gelogd</span></div>'}`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

// ============== ADAPTIVE DELOAD ==============
function checkAdaptiveDeload() {
  const wk = weekOf(state.viewDay);
  if (wk < 3 || isHardcodedDeload(state.viewDay) || state.suggestedDeload['w' + wk]) return null;

  let signals = 0;
  let totalExercises = 0;
  const exDetails = [];

  for (const exId in state.sets) {
    const hist = state.sets[exId].filter(s => s.day < state.viewDay);
    if (hist.length < 3) continue;
    const recent = hist.slice(-3);
    const volumes = recent.map(sess => sess.sets.reduce((sum, s) => sum + (parseFloat(s.w) || 0) * (parseInt(s.r) || 0), 0));
    if (volumes.some(v => v === 0)) continue;
    const latest = volumes[volumes.length - 1];
    const avgPrior = (volumes[0] + volumes[1]) / 2;
    if (avgPrior === 0) continue;
    const drop = (avgPrior - latest) / avgPrior;
    totalExercises++;
    if (drop > 0.05) {
      signals++;
      exDetails.push({ exId, drop: Math.round(drop * 100) });
    }
  }
  if (totalExercises >= 3 && signals / totalExercises >= 0.5) {
    return { signals, totalExercises, exDetails };
  }
  return null;
}

export function renderDeloadSuggestion() {
  const c = document.getElementById('deloadSuggest');
  const sug = checkAdaptiveDeload();
  if (!sug) { c.innerHTML = ''; return; }
  c.innerHTML = `<div class="deload-suggest">
    <div class="title">Deload aanbevolen</div>
    Bij <strong style="color:var(--text)">${sug.signals}/${sug.totalExercises}</strong> oefeningen daalt je volume. Overweeg deze week een deload: volume −30/40%, niet tot falen.
    <div style="margin-top:14px;display:flex;gap:8px;">
      <button class="today-btn" style="flex:1;background:var(--blue-soft);border-color:var(--blue);color:var(--blue);padding:10px;" id="acceptDeload">Bevestig deload</button>
      <button class="today-btn" style="flex:1;background:var(--surface-2);border-color:var(--line);color:var(--text-2);padding:10px;" id="dismissDeload">Negeer</button>
    </div></div>`;
  document.getElementById('acceptDeload').onclick = () => {
    state.suggestedDeload['w' + weekOf(state.viewDay)] = true;
    mutate('meta', 'suggestedDeload');
    renderDeloadSuggestion();
    renderToday();
    toast('Deload-week bevestigd', 'success');
  };
  document.getElementById('dismissDeload').onclick = () => {
    state.suggestedDeload['w' + weekOf(state.viewDay)] = 'dismissed';
    mutate('meta', 'suggestedDeload');
    renderDeloadSuggestion();
  };
}
