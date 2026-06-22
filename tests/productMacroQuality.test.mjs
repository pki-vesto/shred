import test from 'node:test';
import assert from 'node:assert/strict';

import { productMacroQuality } from '../js/nutrition.js';

test('productMacroQuality rates complete seed macros as high quality', () => {
  const quality = productMacroQuality({
    name: 'Magere kwark',
    seed: true,
    kcalPer100g: 60,
    pPer100g: 10,
    cPer100g: 4,
    fPer100g: 0.2
  });

  assert.equal(quality.tier, 'high');
  assert.equal(quality.label, 'Sterk');
  assert.ok(quality.score >= 80);
  assert.ok(quality.reasons.includes('seed'));
});

test('productMacroQuality rates plausible llm estimates as medium quality', () => {
  const quality = productMacroQuality({
    name: 'Restaurant kip',
    source: 'llm',
    kcalPer100g: 165,
    pPer100g: 24,
    cPer100g: 0,
    fPer100g: 7
  });

  assert.equal(quality.tier, 'medium');
  assert.equal(quality.label, 'Indicatief');
  assert.ok(quality.reasons.includes('AI-schatting'));
});

test('productMacroQuality penalizes missing macro data', () => {
  const quality = productMacroQuality({
    name: 'Onbekend product',
    kcalPer100g: 0,
    pPer100g: 0,
    cPer100g: 0,
    fPer100g: 0
  });

  assert.equal(quality.tier, 'low');
  assert.equal(quality.label, 'Laag');
  assert.ok(quality.reasons.includes('macro ontbreekt'));
});

test('productMacroQuality penalizes implausible macro totals', () => {
  const quality = productMacroQuality({
    name: 'Fout etiket',
    kcalPer100g: 120,
    pPer100g: 80,
    cPer100g: 70,
    fPer100g: 10
  });

  assert.equal(quality.tier, 'low');
  assert.ok(quality.reasons.includes('waarde onwaarschijnlijk'));
});
