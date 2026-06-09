import { state } from './state.js';
import { CATEGORIES, exName, getExercise } from './exercises.js';

export function setVolume(set) {
  return (parseFloat(set?.w) || 0) * (parseInt(set?.r) || 0);
}

export function entryVolume(entry) {
  return (entry?.sets || []).reduce((sum, set) => sum + setVolume(set), 0);
}

export function bestSetBefore(exId, beforeDay = Infinity) {
  const entries = state.sets?.[exId] || [];
  let best = null;
  for (const entry of entries) {
    if (entry.day >= beforeDay) continue;
    for (const set of entry.sets || []) {
      const w = parseFloat(set.w);
      const r = parseInt(set.r);
      if (!w || !r) continue;
      if (!best || w > best.w || (w === best.w && r > best.r)) {
        best = { w, r, day: entry.day };
      }
    }
  }
  return best;
}

export function prForSet(exId, day, set) {
  const w = parseFloat(set?.w);
  const r = parseInt(set?.r);
  if (!w || !r) return null;
  const previous = bestSetBefore(exId, day);
  if (!previous) return null;
  if (w > previous.w) return { kind: 'weight', label: 'PR kg' };
  if (w === previous.w && r > previous.r) return { kind: 'reps', label: 'PR reps' };
  return null;
}

export function sessionSummary(items, day) {
  const byGroup = {};
  let totalVolume = 0;
  let completeSets = 0;
  let prCount = 0;

  for (const item of items || []) {
    const entry = state.sets?.[item.exId]?.find(s => s.day === day);
    if (!entry) continue;
    const group = CATEGORIES[item.category]?.group || item.category || 'Overig';
    for (const set of entry.sets || []) {
      const vol = setVolume(set);
      if (vol <= 0) continue;
      totalVolume += vol;
      completeSets++;
      byGroup[group] = (byGroup[group] || 0) + vol;
      if (prForSet(item.exId, day, set)) prCount++;
    }
  }

  return { totalVolume, completeSets, prCount, byGroup };
}

export function exerciseSummary(exId, entry) {
  const volume = entryVolume(entry);
  const sets = (entry?.sets || []).filter(s => setVolume(s) > 0).length;
  const top = topSet(entry);
  return {
    volume,
    sets,
    topLabel: top ? `${top.w} x ${top.r}` : '',
    name: exName(exId)
  };
}

function topSet(entry) {
  let best = null;
  for (const set of entry?.sets || []) {
    const w = parseFloat(set.w);
    const r = parseInt(set.r);
    if (!w || !r) continue;
    if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r };
  }
  return best;
}

// ============================================================================
// Trainingsintelligentie — additieve analytics over state.sets.
// Read-only: geen mutaties, geen nieuwe sync-types, geen schema. Alles wordt
// per render opnieuw berekend uit de bestaande gelogde sets.
// ============================================================================

// Geschatte 1RM volgens Epley (w * (1 + reps/30)); reps==1 → het gewicht zelf.
export function estimated1RM(set) {
  const w = parseFloat(set?.w) || 0;
  const r = parseInt(set?.r) || 0;
  if (!w || !r) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

// Beste aggregaten (zwaarste set, meeste reps, hoogste sessievolume, hoogste
// e1RM) over alle ingevulde sessies van `exId` vóór `beforeDay`. null als er
// nog geen ingevulde historie is.
function exerciseBests(exId, beforeDay = Infinity) {
  const arr = state.sets?.[exId] || [];
  let maxWeight = 0, maxReps = 0, maxVolume = 0, maxE1rm = 0, has = false;
  for (const entry of arr) {
    if (entry.day >= beforeDay) continue;
    let vol = 0, ok = false;
    for (const set of entry.sets || []) {
      const w = parseFloat(set.w) || 0;
      const r = parseInt(set.r) || 0;
      if (!w || !r) continue;
      ok = true;
      vol += w * r;
      if (w > maxWeight) maxWeight = w;
      if (r > maxReps) maxReps = r;
      const e = estimated1RM(set);
      if (e > maxE1rm) maxE1rm = e;
    }
    if (ok) { has = true; if (vol > maxVolume) maxVolume = vol; }
  }
  return has ? { maxWeight, maxReps, maxVolume, maxE1rm } : null;
}

// Welke PR-soorten zette de sessie van `exId` op `day` t.o.v. alle eerdere
// ingevulde sessies? Subset van ['weight','reps','volume','e1rm']. De eerste
// keer dat een oefening wordt gelogd telt niet als PR (geen referentie).
export function sessionPRKinds(exId, day) {
  const entry = state.sets?.[exId]?.find(s => s.day === day);
  if (!entry) return [];
  let w = 0, reps = 0, vol = 0, e1rm = 0, ok = false;
  for (const set of entry.sets || []) {
    const sw = parseFloat(set.w) || 0;
    const sr = parseInt(set.r) || 0;
    if (!sw || !sr) continue;
    ok = true;
    vol += sw * sr;
    if (sw > w) w = sw;
    if (sr > reps) reps = sr;
    const e = estimated1RM(set);
    if (e > e1rm) e1rm = e;
  }
  if (!ok) return [];
  const prior = exerciseBests(exId, day);
  if (!prior) return [];
  const kinds = [];
  if (w > prior.maxWeight) kinds.push('weight');
  if (reps > prior.maxReps) kinds.push('reps');
  if (vol > prior.maxVolume) kinds.push('volume');
  if (e1rm > prior.maxE1rm + 0.05) kinds.push('e1rm');
  return kinds;
}

export const PR_LABELS = { weight: 'PR kg', reps: 'PR reps', volume: 'PR volume', e1rm: 'PR e1RM' };

// ---- Weekvolume -------------------------------------------------------------
// Programmaweken zijn blokken van 7 dagen: week N = dag (N-1)*7+1 .. N*7.

function weekDayRange(weekNum) {
  const start = (weekNum - 1) * 7 + 1;
  return { start, end: start + 6 };
}

function volumeInRange(startDay, endDay) {
  const byGroup = {};
  const days = new Set();
  let total = 0;
  for (const exId in (state.sets || {})) {
    const group = CATEGORIES[getExercise(exId)?.category]?.group || 'Overig';
    for (const entry of state.sets[exId]) {
      if (entry.day < startDay || entry.day > endDay) continue;
      let vol = 0;
      for (const set of entry.sets || []) {
        const v = (parseFloat(set.w) || 0) * (parseInt(set.r) || 0);
        if (v > 0) vol += v;
      }
      if (vol > 0) { total += vol; byGroup[group] = (byGroup[group] || 0) + vol; days.add(entry.day); }
    }
  }
  return { total, byGroup, sessionDays: days.size };
}

// Totaalvolume + per spiergroep voor week N, met week-op-week delta (fractie).
export function weeklyVolume(weekNum) {
  const { start, end } = weekDayRange(weekNum);
  const cur = volumeInRange(start, end);
  const prev = weekNum > 1 ? volumeInRange(start - 7, end - 7) : null;
  const delta = prev && prev.total > 0 ? (cur.total - prev.total) / prev.total : null;
  const groups = Object.entries(cur.byGroup).sort((a, b) => b[1] - a[1]);
  return { weekNum, total: cur.total, sessionDays: cur.sessionDays, groups, prevTotal: prev?.total ?? null, delta };
}

// PR's gezet in week N, nieuwste eerst.
export function weekPRSummary(weekNum) {
  const { start, end } = weekDayRange(weekNum);
  const out = [];
  for (const exId in (state.sets || {})) {
    for (const entry of state.sets[exId]) {
      if (entry.day < start || entry.day > end) continue;
      const kinds = sessionPRKinds(exId, entry.day);
      if (kinds.length) out.push({ exId, name: exName(exId), day: entry.day, kinds });
    }
  }
  return out.sort((a, b) => b.day - a.day);
}

// Totaalvolume per programmaweek t/m `uptoWeek` (voor de volume-trendgrafiek).
export function weeklyVolumeSeries(uptoWeek) {
  const out = [];
  for (let w = 1; w <= uptoWeek; w++) {
    const { start, end } = weekDayRange(w);
    out.push({ week: w, total: volumeInRange(start, end).total });
  }
  return out;
}

// Alle PR's t/m `uptoDay`, nieuwste eerst, afgekapt op `limit` (PR-tijdlijn).
export function prTimeline(uptoDay = Infinity, limit = 12) {
  const out = [];
  for (const exId in (state.sets || {})) {
    for (const entry of state.sets[exId]) {
      if (entry.day > uptoDay) continue;
      const kinds = sessionPRKinds(exId, entry.day);
      if (kinds.length) out.push({ exId, name: exName(exId), day: entry.day, kinds });
    }
  }
  out.sort((a, b) => b.day - a.day);
  return limit ? out.slice(0, limit) : out;
}

// ---- Kniebelasting per sessie ----------------------------------------------
// Transparante index, géén black-box risico-getal: knie-relevante categorieën
// tellen zwaarder, knie-onvriendelijke oefeningen (knee_safe:false) krijgen een
// extra factor. De band is puur regelgebaseerd en de bijdragende oefeningen
// worden getoond, zodat Peter ziet waaróp het oordeel rust (#11 / directive:
// "kniebelasting expliciet bewaken").
const KNEE_FACTORS = { quad: 1, hinge: 0.4, glute: 0.4, calf: 0.2 };

export function kneeLoadForSession(items, day) {
  let index = 0, unsafeVolume = 0, quadVolume = 0;
  const contributors = [];
  for (const item of items || []) {
    const exo = getExercise(item.exId);
    const factor = KNEE_FACTORS[exo?.category] ?? 0;
    if (!factor) continue;
    const entry = state.sets?.[item.exId]?.find(s => s.day === day);
    if (!entry) continue;
    let vol = 0;
    for (const set of entry.sets || []) {
      const v = (parseFloat(set.w) || 0) * (parseInt(set.r) || 0);
      if (v > 0) vol += v;
    }
    if (vol <= 0) continue;
    const unsafe = exo?.knee_safe === false;
    index += vol * factor * (unsafe ? 1.5 : 1);
    if (unsafe) unsafeVolume += vol;
    if (exo?.category === 'quad') quadVolume += vol;
    contributors.push({ exId: item.exId, name: exName(item.exId), volume: vol, unsafe });
  }
  contributors.sort((a, b) => b.volume - a.volume);
  let band = 'low';
  if (unsafeVolume > 0) band = 'high';
  else if (quadVolume > 0) band = 'medium';
  return { index: Math.round(index), band, unsafeVolume, contributors };
}
