import { state } from './state.js';
import { dateForDay, formatDate, dayIsComplete, resolveSlots, TOTAL_DAYS } from './helpers.js';
import { SESSIONS, sessionFor } from './sessions.js';
import { dayTotals } from './nutrition.js';
import { confLevel, confLabelOf, nutritionScoreForDay } from './dashboardMetrics.js';
import { weightMetrics, weightData, ewmaSeries, trendForecast } from './bodyMetrics.js';
import { kneeLoadForSession, sessionPRKinds, sessionSummary } from './trainingMetrics.js';

const PR_KINDS = ['weight', 'reps', 'volume', 'e1rm'];
const REST_RECOVERY_TEXT = 'Recovery-data nog niet gekoppeld via Health Core.';

export function phaseReport(fromDay, toDay) {
  const period = buildPeriod(fromDay, toDay);
  const training = trainingSection(period);
  const nutrition = nutritionSection(period);
  const body = bodySection(period);
  const recovery = recoverySection();

  return {
    period,
    training,
    nutrition,
    body,
    recovery,
    recommendation: buildPhaseRecommendation({ period, training, nutrition, body })
  };
}

function buildPeriod(fromDay, toDay) {
  const a = normalizeDay(fromDay);
  const b = normalizeDay(toDay);
  const start = Math.min(a, b);
  const end = Math.max(a, b);
  const days = end - start + 1;
  const fromDate = dateForDay(start);
  const toDate = dateForDay(end);

  return {
    label: days === TOTAL_DAYS ? '90-dagen rapport' : `Dag ${start}-${end}`,
    fromDay: start,
    toDay: end,
    days,
    fromDate,
    toDate,
    fromDateLabel: formatDate(fromDate),
    toDateLabel: formatDate(toDate)
  };
}

function normalizeDay(day) {
  const n = Math.trunc(Number(day));
  if (!Number.isFinite(n)) return 1;
  return Math.min(TOTAL_DAYS, Math.max(1, n));
}

function confidenceFor(n, lowMax = 1, medMax = 3) {
  const level = confLevel(n, lowMax, medMax);
  return { level, label: confLabelOf(level), daysLogged: n };
}

function trainingSection(period) {
  const sessionDays = [];
  const completedDays = [];
  const volumeDays = new Set();
  const volumeByGroup = {};
  const prsByType = Object.fromEntries(PR_KINDS.map(kind => [kind, 0]));
  const knee = { sessions: 0, totalIndex: 0, maxIndex: null, highDays: [], mediumDays: [], unsafeVolume: 0 };
  let totalVolume = 0;

  for (let day = period.fromDay; day <= period.toDay; day++) {
    const code = sessionFor(dateForDay(day));
    if (code === 'R') continue;

    sessionDays.push(day);
    if (dayIsComplete(day)) completedDays.push(day);

    const session = SESSIONS[code];
    if (session?.type !== 'training') continue;

    const items = resolveSlots(session, day);
    const summary = sessionSummary(items, day);
    if (summary.totalVolume > 0) {
      volumeDays.add(day);
      totalVolume += summary.totalVolume;
      for (const [group, volume] of Object.entries(summary.byGroup)) {
        volumeByGroup[group] = (volumeByGroup[group] || 0) + volume;
      }
    }

    for (const item of items) {
      for (const kind of sessionPRKinds(item.exId, day)) {
        prsByType[kind] = (prsByType[kind] || 0) + 1;
      }
    }

    const kneeLoad = kneeLoadForSession(items, day);
    if (kneeLoad.index > 0 || kneeLoad.contributors.length) {
      knee.sessions++;
      knee.totalIndex += kneeLoad.index;
      knee.maxIndex = knee.maxIndex === null ? kneeLoad.index : Math.max(knee.maxIndex, kneeLoad.index);
      knee.unsafeVolume += kneeLoad.unsafeVolume;
      if (kneeLoad.band === 'high') knee.highDays.push(day);
      else if (kneeLoad.band === 'medium') knee.mediumDays.push(day);
    }
  }

  const expectedSessions = sessionDays.length;
  const completedSessions = completedDays.length;
  const volumeSessions = volumeDays.size;
  const confidence = confidenceFor(completedSessions || volumeSessions, 1, 3);
  const completionPct = expectedSessions ? completedSessions / expectedSessions : null;

  return {
    status: expectedSessions ? statusForConfidence(confidence.level) : 'ontbreekt',
    confidence,
    sessions: {
      expected: expectedSessions || null,
      completed: expectedSessions ? completedSessions : null,
      completionPct
    },
    volume: volumeSessions ? {
      total: totalVolume,
      averagePerSession: totalVolume / volumeSessions,
      loggedSessions: volumeSessions,
      byGroup: Object.entries(volumeByGroup).sort((a, b) => b[1] - a[1])
    } : {
      total: null,
      averagePerSession: null,
      loggedSessions: 0,
      byGroup: [],
      status: 'ontbreekt'
    },
    prs: {
      byType: prsByType,
      total: Object.values(prsByType).reduce((sum, n) => sum + n, 0)
    },
    kneeLoad: knee.sessions ? {
      sessions: knee.sessions,
      averageIndex: knee.totalIndex / knee.sessions,
      maxIndex: knee.maxIndex,
      highDays: knee.highDays,
      mediumDays: knee.mediumDays,
      unsafeVolume: knee.unsafeVolume,
      status: knee.highDays.length ? 'hoog' : knee.mediumDays.length ? 'matig' : 'laag'
    } : {
      sessions: 0,
      averageIndex: null,
      maxIndex: null,
      highDays: [],
      mediumDays: [],
      unsafeVolume: null,
      status: 'ontbreekt'
    }
  };
}

function nutritionSection(period) {
  let kcalSum = 0, proteinSum = 0, scoreSum = 0, loggedDays = 0, scoredDays = 0;

  for (let day = period.fromDay; day <= period.toDay; day++) {
    const totals = dayTotals(day);
    if (!hasNutritionLog(totals)) continue;
    loggedDays++;
    kcalSum += totals.kcal;
    proteinSum += totals.p;

    const score = nutritionScoreForDay(day);
    if (score !== null) {
      scoreSum += score;
      scoredDays++;
    }
  }

  const confidence = confidenceFor(loggedDays, Math.max(1, Math.floor(period.days * 0.1)), Math.max(3, Math.floor(period.days * 0.25)));
  const avgKcal = loggedDays ? kcalSum / loggedDays : null;
  const avgProtein = loggedDays ? proteinSum / loggedDays : null;
  const goalProtein = state.goals?.p || null;
  const proteinCompliance = avgProtein !== null && goalProtein ? avgProtein / goalProtein : null;

  return {
    status: loggedDays ? statusForConfidence(confidence.level) : 'ontbreekt',
    confidence,
    loggedDays,
    avgKcal,
    avgProtein,
    macroCompliance: scoredDays ? scoreSum / scoredDays : null,
    scoredDays,
    proteinCompliance,
    goalProtein,
    goalKcal: state.goals?.kcal || null
  };
}

function hasNutritionLog(totals) {
  return totals.kcal > 0 || totals.p > 0 || totals.c > 0 || totals.f > 0;
}

function bodySection(period) {
  const periodWeights = {};
  for (const point of weightData(state.weights)) {
    if (point.day >= period.fromDay && point.day <= period.toDay) periodWeights[point.day] = point.w;
  }

  const metrics = weightMetrics(periodWeights);
  const data = metrics.data;
  const confidence = confidenceFor(data.length, 2, 4);
  if (!data.length) {
    return {
      status: 'ontbreekt',
      confidence,
      weighIns: 0,
      trendStart: null,
      trendEnd: null,
      deltaKg: null,
      kgPerWeek: null,
      plateau: null,
      forecast: null
    };
  }

  const ewma = ewmaSeries(data);
  const start = ewma[0]?.w ?? null;
  const end = ewma[ewma.length - 1]?.w ?? null;
  const spanDays = data[data.length - 1].day - data[0].day + 1;
  const deltaKg = start !== null && end !== null && ewma.length >= 2 ? end - start : null;
  const kgPerWeek = deltaKg !== null && spanDays > 1 ? deltaKg / spanDays * 7 : null;

  return {
    status: statusForConfidence(confidence.level),
    confidence,
    weighIns: data.length,
    trendStart: start,
    trendEnd: end,
    deltaKg,
    kgPerWeek,
    plateau: data.length >= 2 ? metrics.plateauV2 : null,
    forecast: trendForecast(data)
  };
}

function recoverySection() {
  return {
    status: 'niet gekoppeld',
    confidence: confidenceFor(0),
    title: 'Herstel',
    text: REST_RECOVERY_TEXT
  };
}

function statusForConfidence(level) {
  if (level === 'low') return 'indicatief';
  if (level === 'medium') return 'indicatief';
  return 'betrouwbaar';
}

function buildPhaseRecommendation({ training, nutrition, body }) {
  const completion = training.sessions.completionPct;
  if (completion !== null && training.sessions.expected >= 6 && completion < 0.6) {
    return 'Focus komende fase op trainingsconsistentie: plan de eerstvolgende sessies klein en haalbaar.';
  }
  if (nutrition.proteinCompliance !== null && nutrition.proteinCompliance < 0.8 && nutrition.goalProtein) {
    return `Til eiwit richting ${nutrition.goalProtein} g/dag; begin met een vaste eiwitbron bij twee maaltijden.`;
  }
  if (body.plateau === true) {
    return 'Trendgewicht ligt vlak: houd voeding consequenter meetbaar en beoordeel opnieuw na 10 dagen.';
  }
  if (body.kgPerWeek !== null && body.kgPerWeek < -1.0) {
    return 'De daling is snel; borg eiwit, slaap en behoud van trainingsvolume.';
  }
  if (nutrition.confidence.level === 'low') {
    return 'Log voeding vaker, zodat periodebrede conclusies minder indicatief worden.';
  }
  return 'Houd dezelfde routine vast: trainen afvinken, voeding blijven loggen en trendgewicht volgen.';
}
