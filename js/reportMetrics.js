// Faserapport — herbruikbare opbouw van het exporteerbare rapport-object.
// Bundelt de bestaande metric-helpers (dashboard, training, body) tot één
// serialiseerbaar payload zonder UI-koppeling. Geen foto-blobs: alleen
// id/timestamp-metadata van weekfoto's worden meegenomen.

import { state } from './state.js';
import { TOTAL_DAYS, dateForDay, dayIsComplete, todayNum, weekOf, isHardcodedDeload } from './helpers.js';
import { sessionFor, SESSIONS } from './sessions.js';
import { dayTotals } from './nutrition.js';
import { weightData, weightMetrics, ewmaSeries, linearTrendPerWeek, measurementSeries } from './bodyMetrics.js';
import { weeklyVolume } from './trainingMetrics.js';
import { weeklyReview, nutritionScoreForDay } from './dashboardMetrics.js';

export const REPORT_SCHEMA_VERSION = 1;

// 3 fasen × ~5 weken (incl. deload-week). Phase 1: dag 1-35, Phase 2: dag 36-70,
// Phase 3: dag 71-90. Houdt aan hoe de hardcoded deload-weken (5 en 10) als
// scharnier tussen blokken liggen.
export function phaseForDay(day) {
  if (day <= 35) return 1;
  if (day <= 70) return 2;
  return 3;
}

export function phaseRange(phase) {
  if (phase === 1) return { fromDay: 1, toDay: 35 };
  if (phase === 2) return { fromDay: 36, toDay: 70 };
  return { fromDay: 71, toDay: TOTAL_DAYS };
}

// ISO-datum met Europe/Amsterdam-offset i.p.v. UTC. `Intl` geeft ons de offset
// op een tijdzonebewuste manier zonder dat we DST handmatig hoeven uitrekenen.
export function nowAmsterdamISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  const local = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  // Bepaal de huidige offset (in minuten) voor Amsterdam door dezelfde wandklok
  // als UTC-tijd terug te lezen en het verschil tot `date` te nemen.
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  const offsetMin = Math.round((asUtc - date.getTime()) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  return `${local}${sign}${oh}:${om}`;
}

export function todayAmsterdamYMD(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function trainingSection(fromDay, toDay) {
  const weeks = [];
  let totalVolume = 0;
  let expected = 0, done = 0;
  const sessionsByCode = {};
  const missedTraining = [];

  const today = todayNum();
  const seenWeeks = new Set();
  for (let d = fromDay; d <= toDay; d++) {
    const code = sessionFor(dateForDay(d));
    sessionsByCode[code] = (sessionsByCode[code] || 0) + 1;
    if (code === 'R') continue;
    expected++;
    if (dayIsComplete(d)) done++;
    else if (d < today) missedTraining.push(d);

    const wk = weekOf(d);
    if (!seenWeeks.has(wk)) {
      seenWeeks.add(wk);
      const vol = weeklyVolume(wk);
      totalVolume += vol.total || 0;
      weeks.push({
        week: wk,
        deload: isHardcodedDeload((wk - 1) * 7 + 1),
        volume: Math.round(vol.total || 0),
        sessionDays: vol.sessionDays || 0,
        groups: (vol.groups || []).map(([g, v]) => ({ group: g, volume: Math.round(v) }))
      });
    }
  }

  return {
    weeks,
    totalVolume: Math.round(totalVolume),
    sessionsExpected: expected,
    sessionsDone: done,
    completionPct: expected ? Math.round((done / expected) * 1000) / 1000 : null,
    missedTrainingDays: missedTraining,
    sessionsByCode
  };
}

function nutritionSection(fromDay, toDay) {
  const goals = state.goals || {};
  let kcalSum = 0, pSum = 0, cSum = 0, fSum = 0, loggedDays = 0;
  const complianceScores = [];
  const dailyTotals = [];

  for (let d = fromDay; d <= toDay; d++) {
    const t = dayTotals(d);
    const hasLog = t.kcal > 0 || t.p > 0 || t.c > 0 || t.f > 0;
    if (!hasLog) continue;
    loggedDays++;
    kcalSum += t.kcal; pSum += t.p; cSum += t.c; fSum += t.f;
    const score = nutritionScoreForDay(d);
    if (score !== null) complianceScores.push(score);
    dailyTotals.push({ day: d, kcal: Math.round(t.kcal), p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f) });
  }

  const avg = (sum) => loggedDays ? Math.round(sum / loggedDays) : null;
  return {
    loggedDays,
    avgKcal: avg(kcalSum),
    avgProtein: avg(pSum),
    avgCarbs: avg(cSum),
    avgFat: avg(fSum),
    goals: { kcal: goals.kcal ?? null, p: goals.p ?? null, c: goals.c ?? null, f: goals.f ?? null },
    complianceAvg: complianceScores.length
      ? Math.round(complianceScores.reduce((s, v) => s + v, 0) / complianceScores.length)
      : null,
    dailyTotals
  };
}

function bodyComparisonForRange(fromDay, toDay) {
  const wData = weightData(state.weights).filter(d => d.day >= fromDay && d.day <= toDay);
  if (!wData.length) {
    return { weight: { startKg: null, endKg: null, totalDelta: null, ewmaStart: null, ewmaEnd: null, trendPerWeek: null }, measurements: {}, photos: [] };
  }

  const ewma = ewmaSeries(wData);
  const start = wData[0];
  const end = wData[wData.length - 1];
  const ewmaStart = ewma[0].w;
  const ewmaEnd = ewma[ewma.length - 1].w;
  const trendPerWeek = linearTrendPerWeek(ewma);

  const measurementFields = ['waist', 'hip', 'chest', 'arm', 'thigh'];
  const measurements = {};
  for (const field of measurementFields) {
    const series = measurementSeries(state.measurements, field).filter(d => d.day >= fromDay && d.day <= toDay);
    if (!series.length) continue;
    measurements[field] = {
      startCm: series[0].v,
      endCm: series[series.length - 1].v,
      totalDelta: series[series.length - 1].v - series[0].v,
      datapoints: series.length
    };
  }

  // Foto's: alléén metadata (id, takenAt, week). Géén blobs, dataUrls of base64.
  const photos = [];
  for (const wk in state.photos || {}) {
    for (const p of state.photos[wk] || []) {
      const day = weekToFirstDay(Number(wk));
      if (day !== null && day >= fromDay && day <= toDay) {
        photos.push({ id: p.id, week: Number(wk), takenAt: p.ts || null });
      }
    }
  }
  photos.sort((a, b) => (a.takenAt || '').localeCompare(b.takenAt || ''));

  return {
    weight: {
      startKg: round1(start.w),
      endKg: round1(end.w),
      totalDelta: round1(end.w - start.w),
      ewmaStart: round1(ewmaStart),
      ewmaEnd: round1(ewmaEnd),
      trendPerWeek: trendPerWeek === null ? null : round1(trendPerWeek),
      datapoints: wData.length
    },
    measurements,
    photos
  };
}

function bodySection(fromDay, toDay) {
  const overall = weightMetrics(state.weights);
  return {
    overall: {
      ewma: overall.ewma === null ? null : round1(overall.ewma),
      ewmaTrendPerWeek: overall.ewmaTrendPerWeek === null ? null : round1(overall.ewmaTrendPerWeek),
      plateauV2: !!overall.plateauV2,
      datapoints: overall.data.length
    },
    bodyComparison: bodyComparisonForRange(fromDay, toDay)
  };
}

function recoverySection() {
  return {
    source: null,
    note: 'Herstel-data (slaap/HRV) nog niet gekoppeld via Health Core.'
  };
}

function weekToFirstDay(week) {
  if (!Number.isFinite(week) || week < 1) return null;
  return (week - 1) * 7 + 1;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// Bouw het volledige rapport-object voor [fromDay, toDay]. Pure functie:
// leest `state` maar muteert niets. Het resultaat is JSON-serialiseerbaar.
export function phaseReport(fromDay, toDay) {
  const from = clampDay(fromDay ?? 1);
  const to = clampDay(toDay ?? todayNum());
  const lo = Math.min(from, to), hi = Math.max(from, to);

  const review = weeklyReview(hi);

  return {
    training: trainingSection(lo, hi),
    nutrition: nutritionSection(lo, hi),
    body: bodySection(lo, hi),
    recovery: recoverySection(),
    recommendation: review.recommendation || null
  };
}

function clampDay(n) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(TOTAL_DAYS, v));
}

// Defense-in-depth: zelfs als per ongeluk een blob/file/dataUrl in de payload
// belandt, vervangt deze replacer 'm door null bij JSON.stringify.
export function safeReportReplacer(key, value) {
  if (typeof key === 'string' && /^(blob|dataUrl|data_url|base64|file|buffer)$/i.test(key)) return null;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return null;
  if (typeof File !== 'undefined' && value instanceof File) return null;
  if (value instanceof ArrayBuffer) return null;
  if (typeof value === 'string' && value.startsWith('data:')) return null;
  return value;
}

// Bouwt het complete export-payload met header (schemaVersion, generatedAt,
// period) + alle domeinsecties. Bedoeld om direct te serialiseren.
export function buildReportPayload(fromDay, toDay) {
  const from = clampDay(fromDay ?? 1);
  const to = clampDay(toDay ?? todayNum());
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const phase = phaseForDay(hi);
  const report = phaseReport(lo, hi);
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: nowAmsterdamISO(),
    period: { fromDay: lo, toDay: hi, phase },
    training: report.training,
    nutrition: report.nutrition,
    body: report.body,
    recovery: report.recovery,
    recommendation: report.recommendation
  };
}

export function reportFilename(payload) {
  const phase = payload?.period?.phase ?? 'x';
  return `shred-rapport-fase${phase}-${todayAmsterdamYMD()}.json`;
}

export function isReportEmpty(payload) {
  if (!payload) return true;
  const t = payload.training || {};
  const n = payload.nutrition || {};
  const b = payload.body?.bodyComparison || {};
  return (t.sessionsDone || 0) === 0
    && (n.loggedDays || 0) === 0
    && (b.weight?.datapoints || 0) === 0
    && Object.keys(b.measurements || {}).length === 0
    && (b.photos || []).length === 0;
}
