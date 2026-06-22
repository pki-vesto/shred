import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import {
  applyTemplate,
  createProduct,
  saveTemplate,
  templateAnalytics
} from '../js/nutrition.js';

function resetState() {
  Object.assign(state, {
    foods: {},
    products: {},
    mealTemplates: {},
    ts: {}
  });
}

test('applyTemplate stamps template usage metadata', () => {
  resetState();
  const product = createProduct({ id: 'p1', name: 'Kwark', kcalPer100g: 50 });
  const template = saveTemplate('Ontbijt bowl', 'ontbijt', [{ productId: product.id, grams: 250 }]);

  assert.equal(template.useCount, 0);
  assert.equal(template.lastUsedAt, 0);

  const added = applyTemplate(2, 'ontbijt', template.id);

  assert.equal(added, 1);
  assert.equal(template.useCount, 1);
  assert.ok(template.lastUsedAt > 0);
  assert.ok(state.ts.template[template.id]);
});

test('templateAnalytics summarizes usage and top templates deterministically', () => {
  resetState();
  const product = createProduct({ id: 'p1', name: 'Kwark', kcalPer100g: 50 });
  const breakfast = saveTemplate('Ontbijt bowl', 'ontbijt', [{ productId: product.id, grams: 250 }]);
  const lunch = saveTemplate('Lunch bak', 'lunch', [{ productId: product.id, grams: 300 }]);
  saveTemplate('Ongebruikt', 'snack', [{ productId: product.id, grams: 100 }]);

  applyTemplate(2, 'ontbijt', breakfast.id);
  applyTemplate(3, 'ontbijt', breakfast.id);
  applyTemplate(4, 'lunch', lunch.id);

  const all = templateAnalytics();
  assert.equal(all.totalTemplates, 3);
  assert.equal(all.usedTemplates, 2);
  assert.equal(all.totalUses, 3);
  assert.deepEqual(all.top.map(t => [t.name, t.useCount]), [['Ontbijt bowl', 2], ['Lunch bak', 1]]);

  const breakfastOnly = templateAnalytics('ontbijt');
  assert.equal(breakfastOnly.totalTemplates, 1);
  assert.equal(breakfastOnly.totalUses, 2);
});
