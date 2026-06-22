import test from 'node:test';
import assert from 'node:assert/strict';

import { calorieCyclingTargets } from '../js/dashboardMetrics.js';

function weeklyAverage(plan) {
  return Math.round(((plan.training.kcal * plan.trainingDays) + (plan.rest.kcal * plan.restDays)) / (plan.trainingDays + plan.restDays));
}

test('calorieCyclingTargets raises training days and lowers rest days while preserving weekly average', () => {
  const plan = calorieCyclingTargets({ kcal: 2250, p: 180, c: 220, f: 65 });

  assert.equal(plan.training.kcal, 2400);
  assert.equal(plan.rest.kcal, 1875);
  assert.equal(plan.training.p, 180);
  assert.equal(plan.rest.p, 180);
  assert.equal(plan.weeklyAverageKcal, 2250);
  assert.equal(weeklyAverage(plan), 2250);
  assert.match(plan.note, /weekgemiddelde/);
});

test('calorieCyclingTargets clamps delta when base calories are low', () => {
  const plan = calorieCyclingTargets({ kcal: 1400, p: 120, c: 120, f: 45 });

  assert.equal(plan.delta, 80);
  assert.equal(plan.training.kcal, 1480);
  assert.equal(plan.rest.kcal, 1200);
  assert.equal(plan.weeklyAverageKcal, 1400);
});

test('calorieCyclingTargets disables cycling when rest clamp would be unsafe', () => {
  const plan = calorieCyclingTargets({ kcal: 1100, p: 100, c: 100, f: 35 });

  assert.equal(plan.delta, 0);
  assert.equal(plan.training.kcal, 1100);
  assert.equal(plan.rest.kcal, 1100);
  assert.equal(plan.weeklyAverageKcal, 1100);
  assert.match(plan.note, /te laag/);
});
