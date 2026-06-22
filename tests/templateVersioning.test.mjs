import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import {
  applyTemplate,
  createProduct,
  saveTemplate,
  templateRecipeKey,
  templateVersionInfo,
  visibleTemplates
} from '../js/nutrition.js';

function resetState() {
  Object.assign(state, {
    foods: {},
    products: {},
    mealTemplates: {},
    ts: {}
  });
}

test('saveTemplate creates additive recipe versions for same category and name', () => {
  resetState();

  const p1 = createProduct({ id: 'p1', name: 'Kwark', kcalPer100g: 50 });
  const p2 = createProduct({ id: 'p2', name: 'Bessen', kcalPer100g: 40 });

  const first = saveTemplate('  Ontbijt bowl ', 'ontbijt', [{ productId: p1.id, grams: 250 }]);
  const second = saveTemplate('Ontbijt bowl', 'ontbijt', [
    { productId: p1.id, grams: 250 },
    { productId: p2.id, grams: 80 }
  ]);

  assert.equal(first.name, 'Ontbijt bowl');
  assert.equal(first.recipeKey, templateRecipeKey('ontbijt', 'Ontbijt bowl'));
  assert.equal(first.version, 1);
  assert.equal(first.previousTemplateId, null);
  assert.equal(second.version, 2);
  assert.equal(second.previousTemplateId, first.id);
  assert.equal(Object.keys(state.mealTemplates).length, 2);
});

test('visibleTemplates keeps historical versions selectable newest first', () => {
  resetState();
  const p = createProduct({ id: 'p1', name: 'Kwark' });
  const first = saveTemplate('Ontbijt bowl', 'ontbijt', [{ productId: p.id, grams: 200 }]);
  const second = saveTemplate('Ontbijt bowl', 'ontbijt', [{ productId: p.id, grams: 300 }]);

  const templates = visibleTemplates('ontbijt');

  assert.deepEqual(templates.map(t => t.id), [second.id, first.id]);
  assert.deepEqual(templateVersionInfo(first), { version: 1, total: 2, label: 'v1' });
  assert.deepEqual(templateVersionInfo(second), { version: 2, total: 2, label: 'v2' });
});

test('applyTemplate applies the selected historical version exactly', () => {
  resetState();
  const p = createProduct({ id: 'p1', name: 'Kwark' });
  const first = saveTemplate('Ontbijt bowl', 'ontbijt', [{ productId: p.id, grams: 200 }]);
  saveTemplate('Ontbijt bowl', 'ontbijt', [{ productId: p.id, grams: 300 }]);

  const added = applyTemplate(4, 'ontbijt', first.id);

  assert.equal(added, 1);
  assert.deepEqual(state.foods[4].ontbijt.map(item => item.grams), [200]);
});
