import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import { weightMetrics, measurementTrend } from '../js/bodyMetrics.js';
import { sessionPRKinds, weeklyVolume, weeklyVolumeSeries, kneeLoadForSession } from '../js/trainingMetrics.js';
import { dashboardKpis, macroWeeklySeries, nutritionContextSplit, calorieVsWeight, goalPace } from '../js/dashboardMetrics.js';
import { bodyComparison, buildReportPayload, isReportEmpty, safeReportReplacer } from '../js/reportMetrics.js';

function seedState() {
  Object.assign(state, {
    viewDay: 14,
    foodViewDay: 14,
    startDate: '2026-01-01',
    completed: {
      1: { ex0: true, ex1: true, ex2: true, ex3: true, ex4: true, ex5: true, ex6: true, ex7: true },
      4: { rest: true },
      8: { ex0: true, ex1: true, ex2: true, ex3: true, ex4: true, ex5: true, ex6: true, ex7: true },
      11: { rest: true }
    },
    notes: {},
    sets: {
      bench: [
        { day: 1, sets: [{ w: 80, r: 8 }, { w: 80, r: 7 }] },
        { day: 8, sets: [{ w: 82.5, r: 8 }, { w: 80, r: 8 }] }
      ],
      rdl: [
        { day: 1, sets: [{ w: 100, r: 8 }] },
        { day: 8, sets: [{ w: 105, r: 8 }] }
      ],
      legpress: [
        { day: 3, sets: [{ w: 180, r: 10 }] },
        { day: 10, sets: [{ w: 190, r: 10 }] }
      ],
      bulgarian_split: [
        { day: 10, sets: [{ w: 20, r: 8 }] }
      ]
    },
    exerciseNotes: {},
    weights: {
      1: 90,
      3: 89.7,
      7: 89.2,
      10: 88.9,
      14: 88.4
    },
    measurements: {
      1: { waist: 96, hip: 104 },
      8: { waist: 94.5, hip: 103.5 },
      14: { waist: 93.8, hip: 103 }
    },
    cardio: {},
    photos: {
      1: [{ id: 'front-start', ts: '2026-01-04T08:00:00.000Z' }],
      2: [{ id: 'front-now', ts: '2026-01-11T08:00:00.000Z' }]
    },
    foods: {
      1: { ontbijt: [{ productId: 'oats', grams: 100 }], lunch: [], snack: [], diner: [{ productId: 'chicken', grams: 200 }] },
      2: { ontbijt: [{ productId: 'oats', grams: 80 }], lunch: [{ productId: 'chicken', grams: 150 }], snack: [], diner: [] },
      8: { ontbijt: [{ productId: 'oats', grams: 120 }], lunch: [], snack: [], diner: [{ productId: 'chicken', grams: 220 }] },
      9: { ontbijt: [{ productId: 'oats', grams: 90 }], lunch: [{ productId: 'chicken', grams: 180 }], snack: [], diner: [] }
    },
    products: {
      oats: { id: 'oats', name: 'Oats', kcalPer100g: 372, pPer100g: 13.5, cPer100g: 58.7, fPer100g: 7 },
      chicken: { id: 'chicken', name: 'Chicken', kcalPer100g: 165, pPer100g: 31, cPer100g: 0, fPer100g: 3.6 }
    },
    mealTemplates: {},
    goals: { kcal: 2250, p: 180, c: 220, f: 65 },
    suggestedDeload: {},
    slotChoices: {},
    slotDefaults: {},
    favoriteExercises: {},
    ts: {}
  });
}

test('bodyMetrics smoke coverage computes weight and measurement trends', () => {
  seedState();

  const weight = weightMetrics(state.weights);
  assert.equal(weight.latest.day, 14);
  assert.equal(weight.latest.w, 88.4);
  assert.ok(weight.ewma < 90);
  assert.ok(weight.consistency.logged >= 4);
  assert.ok(weight.forecast.projected < weight.forecast.current);

  const waist = measurementTrend(state.measurements, 'waist');
  assert.equal(waist.latest.v, 93.8);
  assert.ok(waist.totalDelta < 0);
});

test('trainingMetrics smoke coverage summarizes volume, PRs, and knee load', () => {
  seedState();

  const week1 = weeklyVolume(1);
  assert.equal(week1.sessionDays, 2);
  assert.ok(week1.total > 0);
  assert.ok(week1.groups.some(([group]) => group === 'Push'));

  const series = weeklyVolumeSeries(2);
  assert.deepEqual(series.map(p => p.week), [1, 2]);
  assert.ok(series[1].total > series[0].total);

  assert.ok(sessionPRKinds('bench', 8).includes('weight'));

  const knee = kneeLoadForSession([
    { exId: 'legpress' },
    { exId: 'bulgarian_split' }
  ], 10);
  assert.equal(knee.band, 'high');
  assert.ok(knee.contributors.some(c => c.exId === 'bulgarian_split' && c.unsafe));
});

test('dashboardMetrics smoke coverage builds KPIs and nutrition context', () => {
  seedState();

  const kpis = dashboardKpis(14);
  assert.equal(kpis.length, 4);
  assert.ok(kpis.every(kpi => kpi.key && kpi.confidence));

  const macro = macroWeeklySeries(2);
  assert.equal(macro.length, 2);
  assert.equal(macro[0].days, 2);

  const split = nutritionContextSplit(14);
  assert.ok(split.weekday.days > 0);
  assert.ok(split.trainingDay.avgProtein > 0);

  const calories = calorieVsWeight(14);
  assert.equal(calories.empty, false);
  assert.ok(calories.avgKcalRecent > 0);

  const pace = goalPace(14);
  assert.equal(pace.day, 14);
  assert.ok(pace.expected > 0);
});

test('reportMetrics smoke coverage builds serializable report payloads', () => {
  seedState();

  const comparison = bodyComparison(1, 14, state);
  assert.equal(comparison.measurements[0].key, 'waist');
  assert.equal(comparison.photos.from.id, 'front-start');
  assert.equal(comparison.photos.to.id, 'front-now');

  const payload = buildReportPayload(1, 14);
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.period.fromDay, 1);
  assert.equal(payload.period.toDay, 14);
  assert.ok(payload.training.sessionsDone > 0);
  assert.ok(payload.nutrition.loggedDays > 0);
  assert.equal(isReportEmpty(payload), false);

  const json = JSON.stringify({ payload, blob: new ArrayBuffer(8), dataUrl: 'data:image/png;base64,abc' }, safeReportReplacer);
  assert.match(json, /"blob":null/);
  assert.match(json, /"dataUrl":null/);
});
