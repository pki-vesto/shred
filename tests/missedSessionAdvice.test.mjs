import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import { missedSessionRecoveryAdvice, weeklyReview } from '../js/dashboardMetrics.js';

function resetState() {
  Object.assign(state, {
    startDate: '2026-01-05',
    completed: {},
    weights: {},
    foods: {},
    products: {},
    goals: { kcal: 2250, p: 180, c: 220, f: 65 }
  });
}

function completeStrength(day) {
  state.completed[day] = {};
  for (let i = 0; i < 8; i++) state.completed[day]['ex' + i] = true;
}

test('missedSessionRecoveryAdvice returns null when no prior strength session is missed', () => {
  resetState();
  completeStrength(1);
  completeStrength(4);
  completeStrength(6);

  assert.equal(missedSessionRecoveryAdvice(7), null);
});

test('missedSessionRecoveryAdvice gives conservative next-day guidance', () => {
  resetState();
  completeStrength(1);
  completeStrength(4);

  const advice = missedSessionRecoveryAdvice(7);

  assert.equal(advice.latest.day, 6);
  assert.equal(advice.severity, 'medium');
  assert.match(advice.text, /Gisteren viel benen\/calisthenics weg/);
  assert.match(advice.recommendation, /Niet inhalen/);
});

test('missedSessionRecoveryAdvice escalates when multiple sessions were missed', () => {
  resetState();
  completeStrength(1);

  const advice = missedSessionRecoveryAdvice(8);

  assert.equal(advice.missed.length, 2);
  assert.equal(advice.severity, 'high');
  assert.match(advice.text, /Stapel geen inhaalsessies/);
  assert.match(advice.recommendation, /Ritme eerst/);
});

test('weeklyReview surfaces the deterministic missed-session recommendation', () => {
  resetState();
  completeStrength(1);
  completeStrength(4);

  const review = weeklyReview(7);
  const missedItem = review.items.find(item => item.title === 'Gemiste training');

  assert.ok(missedItem);
  assert.match(missedItem.text, /dag 6 niet voltooid/);
  assert.match(review.recommendation, /Niet inhalen/);
});
