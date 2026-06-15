import { state } from './state.js';
import { dateForDay, dayIsComplete, todayNum, weekOf } from './helpers.js';
import { sessionFor } from './sessions.js';
import { dayTotals } from './nutrition.js';
import { weightMetrics } from './bodyMetrics.js';

const TRAINING_DAYS_PER_WEEK = 5;

export function currentWeekRange(day = todayNum()) {
  const week = weekOf(day);
  const start = (week - 1) * 7 + 1;
  const end = Math.min(start + 6, todayNum());
  return { week, start, end };
}

export function weeklyMetrics(day = todayNum()) {
  const range = currentWeekRange(day);
  const days = [];
  for (let d = range.start; d <= range.end; d++) days.push(d);

  const completedDays = days.filter(dayIsComplete).length;
  const nutritionDays = days.filter(d => hasFoodLog(d));
  const nutritionScores = nutritionDays.map(nutritionScoreForDay);
  const avgNutritionScore = nutritionScores.length
    ? nutritionScores.reduce((sum, n) => sum + n, 0) / nutritionScores.length
    : null;
  const calories = nutritionDays.map(d => dayTotals(d).kcal);
  const avgCalories = calories.length
    ? calories.reduce((sum, n) => sum + n, 0) / calories.length
    : null;
  const proteins = nutritionDays.map(d => dayTotals(d).p);
  const avgProtein = proteins.length
    ? proteins.reduce((sum, n) => sum + n, 0) / proteins.length
    : null;
  const weights = weightMetrics(state.weights);
  const missedTraining = missedTrainingDays(range.start, range.end);

  return {
    ...range,
    daysElapsed: days.length,
    completedDays,
    completionPct: days.length ? completedDays / days.length : 0,
    targetSessions: TRAINING_DAYS_PER_WEEK,
    nutritionLoggedDays: nutritionDays.length,
    avgNutritionScore,
    avgCalories,
    avgProtein,
    weighIns: weights.data.length,
    missedTraining,
    weight: weights
  };
}

// Confidence-niveau op basis van het aantal relevante datapunten. Gebruikt door
// KPI's en weekreview-items zodat dunne data eerlijk als "indicatief" toont
// i.p.v. als hard feit (#109/#164).
export function confLevel(n, lowMax = 1, medMax = 3) {
  if (!n) return 'low';
  if (n <= lowMax) return 'low';
  if (n <= medMax) return 'medium';
  return 'high';
}
const CONF_LABEL = { low: 'lage zekerheid', medium: 'indicatief', high: 'betrouwbaar' };
export function confLabelOf(level) { return CONF_LABEL[level] || ''; }

export function dashboardKpis(day = todayNum()) {
  const week = weeklyMetrics(day);
  const weightLabel = week.weight.ewmaTrendPerWeek === null ? 'Opbouwen' : signed(week.weight.ewmaTrendPerWeek) + ' kg/wk';
  const kcalLabel = week.avgCalories === null ? 'Geen log' : Math.round(week.avgCalories).toString();
  const nutritionLabel = week.avgNutritionScore === null ? 'Geen score' : Math.round(week.avgNutritionScore) + '%';

  return [
    {
      key: 'training',
      label: 'Week voltooid',
      value: Math.round(week.completionPct * 100) + '%',
      sub: `${week.completedDays}/${week.daysElapsed} dagen afgevinkt`,
      tone: week.completionPct >= 0.8 ? 'good' : week.completionPct >= 0.5 ? 'warn' : 'bad',
      confidence: confLevel(week.daysElapsed, 2, 4)
    },
    {
      key: 'weight',
      label: 'Gewichtstrend',
      value: weightLabel,
      sub: week.weight.ewma === null ? 'Nog geen trendgewicht' : `${week.weight.ewma.toFixed(1)} kg trend (EWMA)`,
      tone: week.weight.plateauV2 ? 'warn' : week.weight.ewmaTrendPerWeek === null ? 'neutral' : week.weight.ewmaTrendPerWeek <= -0.15 ? 'good' : 'warn',
      confidence: confLevel(week.weighIns, 2, 4)
    },
    {
      key: 'nutrition',
      label: 'Voeding',
      value: nutritionLabel,
      sub: `${week.nutritionLoggedDays}/${week.daysElapsed} dagen gelogd`,
      tone: week.avgNutritionScore === null ? 'neutral' : week.avgNutritionScore >= 85 ? 'good' : week.avgNutritionScore >= 70 ? 'warn' : 'bad',
      confidence: confLevel(week.nutritionLoggedDays, 1, 3)
    },
    {
      key: 'kcal',
      label: 'Gem. kcal',
      value: kcalLabel,
      sub: week.avgCalories === null ? 'Log maaltijden voor trend' : `doel ${state.goals.kcal}`,
      tone: week.avgCalories === null ? 'neutral' : Math.abs(week.avgCalories - state.goals.kcal) <= 150 ? 'good' : 'warn',
      confidence: confLevel(week.nutritionLoggedDays, 1, 3)
    }
  ];
}

export function trainingHeatmapStatus(day, today = todayNum()) {
  if (day > today) return 'future';
  const code = sessionFor(dateForDay(day));
  if (code === 'R') return 'rest';
  if (dayIsComplete(day)) return 'done';
  return day < today ? 'missed' : 'pending';
}

// Volledig weekrapport (#160): training, lichaam, voeding, eiwit, herstel en
// risico's — elk met een confidence (#109) — plus één concrete aanbeveling.
export function weeklyReview(day = todayNum()) {
  const week = weeklyMetrics(day);
  const items = [];
  const trainConf = confLevel(week.daysElapsed, 2, 4);
  const nutConf = confLevel(week.nutritionLoggedDays, 1, 3);
  const weightConf = confLevel(week.weighIns, 2, 4);
  const w = week.weight;

  // Training consistency
  if (week.completionPct >= 0.85) {
    items.push({ tone: 'good', confidence: trainConf, title: 'Training consistent', text: `${week.completedDays} van ${week.daysElapsed} dagen zijn voltooid deze week.` });
  } else if (week.daysElapsed >= 3) {
    items.push({ tone: 'warn', confidence: trainConf, title: 'Training achterstand', text: `Deze week staat op ${week.completedDays}/${week.daysElapsed}. Pak de eerstvolgende sessie kort en strak op.` });
  }
  if (week.missedTraining.length) {
    const list = week.missedTraining.slice(-3).map(d => `dag ${d}`).join(', ');
    items.push({ tone: 'warn', confidence: 'high', title: 'Gemiste training', text: `${list} niet voltooid. Houd de volgende sessie kort, maar sla de gewoonte niet over.` });
  }

  // Lichaam — op EWMA-trendgewicht (#49 body-deel van het rapport)
  if (w.ewma !== null && w.ewmaTrendPerWeek !== null) {
    const r = w.ewmaTrendPerWeek;
    if (w.plateauV2) items.push({ tone: 'warn', confidence: weightConf, title: 'Gewichtsplateau', text: `Trendgewicht ${w.ewma.toFixed(1)} kg ligt vlak. Check calorie-gemiddelde en weekend-inname.` });
    else if (r < -1.0) items.push({ tone: 'warn', confidence: weightConf, title: 'Snelle daling', text: `${signed(r)} kg/week is agressief. Let op herstel en performance.` });
    else if (r <= -0.2) items.push({ tone: 'good', confidence: weightConf, title: 'Gewicht beweegt', text: `Trendgewicht daalt ${signed(r)} kg/week — bruikbare fat-loss feedback.` });
    else items.push({ tone: 'neutral', confidence: weightConf, title: 'Gewicht stabiel', text: `Trendgewicht ${w.ewma.toFixed(1)} kg, ${signed(r)} kg/week.` });
  } else {
    items.push({ tone: 'neutral', confidence: 'low', title: 'Gewicht opbouwen', text: 'Log meer weegmomenten voor een betrouwbare trend.' });
  }

  // Voeding — compliance + eiwit (#49)
  if (week.avgNutritionScore !== null) {
    if (week.avgNutritionScore >= 85) items.push({ tone: 'good', confidence: nutConf, title: 'Voeding strak', text: `Macro-compliance gemiddeld ${Math.round(week.avgNutritionScore)}%.` });
    else if (week.nutritionLoggedDays >= 2) items.push({ tone: 'warn', confidence: nutConf, title: 'Voeding bijsturen', text: `Macro-compliance gemiddeld ${Math.round(week.avgNutritionScore)}%. Eiwit en calorieën eerst fixen.` });
  } else {
    items.push({ tone: 'neutral', confidence: 'low', title: 'Voeding ontbreekt', text: 'Log minimaal twee dagen om een bruikbare weekreview te krijgen.' });
  }
  if (week.avgProtein !== null && state.goals?.p) {
    const ratio = week.avgProtein / state.goals.p;
    if (ratio < 0.8) items.push({ tone: 'warn', confidence: nutConf, title: 'Eiwit aan de lage kant', text: `Gem. ${Math.round(week.avgProtein)} g/dag vs doel ${state.goals.p} g. Eiwit beschermt spiermassa in een cut.` });
    else if (ratio >= 0.95) items.push({ tone: 'good', confidence: nutConf, title: 'Eiwit op koers', text: `Gem. ${Math.round(week.avgProtein)} g/dag — rond je doel van ${state.goals.p} g.` });
  }

  // Herstel — eerlijk neutraal tot Health Core read-integratie live is
  items.push({ tone: 'neutral', confidence: 'low', title: 'Herstel', text: 'Recovery-data (slaap/HRV) nog niet gekoppeld via Health Core.' });

  return { week, items: items.slice(0, 7), recommendation: buildRecommendation(week) };
}

function buildRecommendation(week) {
  const w = week.weight;
  if (week.daysElapsed >= 3 && week.completionPct < 0.6) return 'Focus deze week op consistentie: plan je eerstvolgende sessie nu in en houd hem kort.';
  if (week.avgProtein !== null && state.goals?.p && week.avgProtein < 0.8 * state.goals.p) return `Til je eiwit naar ~${state.goals.p} g/dag — voeg een eiwitbron toe aan je twee grootste maaltijden.`;
  if (w.plateauV2) return 'Plateau: trek de weekend-inname strakker of verlaag kcal licht (~100-150) en hermeet over 10 dagen.';
  if (w.ewmaTrendPerWeek !== null && w.ewmaTrendPerWeek < -1.0) return 'Daling is snel — borg slaap en eiwit, en houd trainingsvolume vast om spiermassa te beschermen.';
  if (week.nutritionLoggedDays < 3) return 'Log minstens 3 dagen voeding zodat de analyses betrouwbaar worden.';
  return 'Goede week — houd dezelfde routine vast en blijf loggen.';
}

// Gemiddelde kcal/eiwit per programmaweek t/m `uptoWeek` (macro-trendgrafiek).
// Alleen gelogde dagen tellen mee, zodat ongelogde dagen het gemiddelde niet
// kunstmatig verlagen.
export function macroWeeklySeries(uptoWeek = weekOf(todayNum())) {
  const out = [];
  for (let w = 1; w <= uptoWeek; w++) {
    const start = (w - 1) * 7 + 1, end = start + 6;
    let kcalSum = 0, pSum = 0, n = 0;
    for (let d = start; d <= end; d++) {
      const t = dayTotals(d);
      if (t.kcal > 0 || t.p > 0) { kcalSum += t.kcal; pSum += t.p; n++; }
    }
    out.push({ week: w, days: n, avgKcal: n ? kcalSum / n : null, avgP: n ? pSum / n : null });
  }
  return out;
}

// Calorie-trend vs gewichtstrend (#15 / roadmap-doel 45). Pure, deterministische
// helper die het 14-daags caloriegemiddelde naast de EWMA-gewichtstrend zet en
// een niet-causale duiding teruggeeft. Geen TDEE-claim, geen "X veroorzaakt Y":
// alleen "consistent met" / "ondanks" / "bij" — conform docs/14 § Analyseprincipes.
export function calorieVsWeight(uptoDay = todayNum(), windowDays = 14) {
  const wm = weightMetrics(state.weights);
  const fromDay = Math.max(1, uptoDay - windowDays + 1);
  let kcalSum = 0, loggedDays = 0;
  for (let d = fromDay; d <= uptoDay; d++) {
    const kcal = dayTotals(d).kcal;
    if (kcal > 0) { kcalSum += kcal; loggedDays++; }
  }
  const weighIns = wm.consistency ? wm.consistency.logged : 0;

  if (loggedDays === 0 || weighIns === 0) {
    return { empty: true, reason: 'missing-data', loggedDays, weighIns };
  }

  const avgKcalRecent = Math.round(kcalSum / loggedDays);
  const trend = wm.ewmaTrendPerWeek;
  const ewmaTrendPerWeek = trend === null ? null : (Math.round(trend * 10) / 10) + 0;
  const goalKcal = state.goals?.kcal || 0;
  const lowIntake = goalKcal > 0 ? avgKcalRecent <= goalKcal : false;
  const verdict = verdictFor({
    ewmaTrendPerWeek,
    avgKcalRecent,
    plateauV2: wm.plateauV2,
    lowIntake
  });
  const conf = confLevel(Math.min(loggedDays, weighIns), 2, 4);

  return {
    empty: false,
    avgKcalRecent,
    ewmaTrendPerWeek,
    loggedDays,
    weighIns,
    plateauV2: wm.plateauV2,
    conf,
    verdict
  };
}

function verdictFor({ ewmaTrendPerWeek, avgKcalRecent, plateauV2, lowIntake }) {
  const absTrend = ewmaTrendPerWeek === null ? null : Math.abs(ewmaTrendPerWeek).toFixed(1).replace('.', ',');
  const kcalLabel = `${avgKcalRecent} kcal`;
  if (plateauV2 && lowIntake) {
    return `Plateau ondanks lage inname (${kcalLabel}/d) — check logkwaliteit en vochtbalans.`;
  }
  if (ewmaTrendPerWeek !== null && ewmaTrendPerWeek <= -0.1) {
    return `Trend daalt ${absTrend} kg/wk bij gem. ${kcalLabel}/d — consistent met een cut.`;
  }
  if (ewmaTrendPerWeek !== null && ewmaTrendPerWeek >= 0.1) {
    return `Trend stijgt ${absTrend} kg/wk bij gem. ${kcalLabel}/d — inname boven onderhoud.`;
  }
  return `Trend ~vlak bij gem. ${kcalLabel}/d — observeer nog ~1 week.`;
}

// 90-dagen tempo: trainingscompletion vs verwacht én geprojecteerd gewicht op
// dag 90 op basis van de EWMA-trend. Geen TDEE-aanname; conservatief.
export function goalPace(day = todayNum()) {
  let expected = 0, done = 0;
  for (let d = 1; d <= day; d++) {
    if (sessionFor(dateForDay(d)) === 'R') continue;
    expected++;
    if (dayIsComplete(d)) done++;
  }
  const trainingPct = expected ? done / expected : null;

  const wm = weightMetrics(state.weights);
  let projected = null, projectedChange = null;
  if (wm.ewma !== null && wm.data.length >= 2) {
    const perDay = wm.ewmaTrendPerWeek === null ? 0 : wm.ewmaTrendPerWeek / 7;
    projected = wm.ewma + perDay * Math.max(0, 90 - day);
    projectedChange = projected - wm.data[0].w;
  }
  return { day, expected, done, trainingPct, projected, projectedChange, weighIns: wm.data.length };
}

function hasFoodLog(day) {
  const totals = dayTotals(day);
  return totals.kcal > 0 || totals.p > 0 || totals.c > 0 || totals.f > 0;
}

function missedTrainingDays(start, end) {
  const today = todayNum();
  const missed = [];
  for (let day = start; day <= Math.min(end, today - 1); day++) {
    const code = sessionFor(dateForDay(day));
    if (!code.startsWith('K')) continue;
    if (!dayIsComplete(day)) missed.push(day);
  }
  return missed;
}

export function nutritionScoreForDay(day) {
  if (!hasFoodLog(day)) return null;
  const totals = dayTotals(day);
  const goals = state.goals || {};
  const kcalScore = targetScore(totals.kcal, goals.kcal || 0, 0.12);
  const proteinScore = targetScore(totals.p, goals.p || 0, 0.15);
  return Math.round(kcalScore * 0.6 + proteinScore * 0.4);
}

function targetScore(value, target, tolerance) {
  if (!target || !value) return 0;
  const miss = Math.abs(value - target) / target;
  if (miss <= tolerance) return 100;
  return Math.max(0, 100 - ((miss - tolerance) / tolerance) * 50);
}

function signed(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
}
