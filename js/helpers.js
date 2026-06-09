import { state } from './state.js';
import { SESSIONS, sessionFor } from './sessions.js';
import { getExercise, exName, equipmentFor } from './exercises.js';

export const TOTAL_DAYS = 90;
export const NL_DAYS_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const NL_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function getStartDate() {
  if (state.startDate) {
    const [y, m, d] = state.startDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function dateForDay(n) {
  const d = getStartDate();
  d.setDate(d.getDate() + (n - 1));
  return d;
}

export function todayNum() {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const s = getStartDate(); s.setHours(0, 0, 0, 0);
  const diff = Math.floor((now - s) / 86400000) + 1;
  return Math.max(1, Math.min(TOTAL_DAYS, diff));
}

export function formatDate(d) {
  return `${NL_DAYS_LONG[d.getDay()]} ${d.getDate()} ${NL_MONTHS[d.getMonth()]}`;
}

export function weekOf(dayN) {
  return Math.floor((dayN - 1) / 7) + 1;
}

export function isHardcodedDeload(dayNum) {
  return (dayNum >= 29 && dayNum <= 35) || (dayNum >= 64 && dayNum <= 70);
}

export function isCurrentWeekDeload() {
  const wk = weekOf(state.viewDay);
  return isHardcodedDeload(state.viewDay) || state.suggestedDeload['w' + wk] === true;
}

export function dayIsComplete(n) {
  const code = sessionFor(dateForDay(n));
  if (code === 'R') return state.completed[n]?.rest === true;
  if (code === 'CI' || code === 'CZ') return state.completed[n]?.cardio === true;
  const sess = SESSIONS[code];
  if (!sess.slots) return false;
  const done = state.completed[n] || {};
  return sess.slots.every((_, i) => done['ex' + i]);
}

// ---- Set-historie per concrete oefening ------------------------------------
// Alle historie-lookups werken op de CONCRETE exId, dus een geswapte variant
// heeft strikt zijn eigen geschiedenis (80 kg barbell ≠ 80 kg dumbbell).

// Sessies met daadwerkelijk ingevulde sets, op dagvolgorde, vóór `beforeDay`.
function filledSessions(exId, beforeDay = Infinity) {
  const arr = state.sets[exId];
  if (!arr) return [];
  return arr.filter(s => s.day < beforeDay && s.sets.some(x => x.w && x.r));
}

// Meest recente ingevulde sessie vóór `beforeDay` (of null).
export function getLastSession(exId, beforeDay = Infinity) {
  const f = filledSessions(exId, beforeDay);
  return f.length ? f[f.length - 1] : null;
}

// Dagnummer van de laatste keer dat deze oefening gedaan is (of null).
export function lastDoneDay(exId, beforeDay = Infinity) {
  const last = getLastSession(exId, beforeDay);
  return last ? last.day : null;
}

// Beste ooit gehaalde set: hoogste gewicht, bij gelijk gewicht meeste reps.
export function bestSet(exId) {
  const arr = state.sets[exId];
  if (!arr) return null;
  let best = null;
  for (const sess of arr) for (const s of sess.sets) {
    const w = parseFloat(s.w), r = parseInt(s.r);
    if (!w || !r) continue;
    if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r };
  }
  return best;
}

// Trend van het laatste sessie-volume t.o.v. de twee daarvoor: 'up' | 'down' |
// 'flat', of null als er < 3 ingevulde sessies zijn.
export function volumeTrend(exId, beforeDay = Infinity) {
  const sessions = filledSessions(exId, beforeDay);
  if (sessions.length < 3) return null;
  const vol = (s) => s.sets.reduce((t, x) => t + (parseFloat(x.w) || 0) * (parseInt(x.r) || 0), 0);
  const [a, b, c] = sessions.slice(-3);
  const prevAvg = (vol(a) + vol(b)) / 2;
  if (!prevAvg) return null;
  const latest = vol(c);
  if (latest > prevAvg * 1.01) return 'up';
  if (latest < prevAvg * 0.99) return 'down';
  return 'flat';
}

// Korte datum 'd mon' voor een dagnummer (bv "10 jun").
export function shortDate(day) {
  const d = dateForDay(day);
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]}`;
}

// ---- Slot → actieve oefening -----------------------------------------------
// Welke concrete oefening is op dag `day` actief voor een slot? Volgorde van
// voorkeur: een keuze voor déze dag (slotChoices), anders de onthouden
// standaard voor dit slot (slotDefaults), anders de schema-default. Een keuze
// die niet (meer) in de catalog zit of niet in de slot-categorie valt, wordt
// genegeerd zodat de UI nooit op een ongeldige id terugvalt.
export function activeExId(slot, day) {
  const candidates = [state.slotChoices?.[day]?.[slot.id], state.slotDefaults?.[slot.id]];
  for (const id of candidates) {
    if (!id) continue;
    const exo = getExercise(id);
    if (exo && exo.category === slot.category) return id;
  }
  return slot.default;
}

// Bouwt de view-items voor een krachtsessie op `day`: elk slot opgelost naar
// zijn actieve oefening. `idx` blijft positie-stabiel voor state.completed.
export function resolveSlots(sess, day) {
  if (!sess.slots) return [];
  return sess.slots.map((slot, i) => {
    const exId = activeExId(slot, day);
    const exo = getExercise(exId);
    return {
      idx: i,
      slotId: slot.id,
      category: slot.category,
      exId,
      name: exName(exId),
      notes: exo?.notes || '',
      equipment: equipmentFor(exo),
      kneeSafe: exo ? exo.knee_safe !== false : true,
      sr: slot.sr,
      rest: slot.rest,
      default: slot.default,
      isSwapped: exId !== slot.default
    };
  });
}
