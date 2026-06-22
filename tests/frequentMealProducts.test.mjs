import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import { createProduct, frequentMealProducts } from '../js/nutrition.js';

function resetState() {
  Object.assign(state, {
    foods: {},
    products: {},
    mealTemplates: {},
    ts: {}
  });
}

test('frequentMealProducts ranks by category-specific count then recency', () => {
  resetState();
  createProduct({ id: 'p1', name: 'Kwark', lastGrams: 250 });
  createProduct({ id: 'p2', name: 'Havermout', lastGrams: 60 });
  createProduct({ id: 'p3', name: 'Bessen', lastGrams: 80 });

  state.foods = {
    1: { ontbijt: [{ productId: 'p1', grams: 250, addedAt: 10 }, { productId: 'p2', grams: 60, addedAt: 20 }], lunch: [], snack: [], diner: [] },
    2: { ontbijt: [{ productId: 'p1', grams: 300, addedAt: 30 }, { productId: 'p3', grams: 80, addedAt: 40 }], lunch: [], snack: [], diner: [] },
    3: { ontbijt: [{ productId: 'p2', grams: 70, addedAt: 50 }], lunch: [], snack: [], diner: [] }
  };

  const quick = frequentMealProducts('ontbijt');

  assert.deepEqual(quick.map(q => q.productId), ['p2', 'p1', 'p3']);
  assert.deepEqual(quick.map(q => q.grams), [70, 300, 80]);
  assert.deepEqual(quick.map(q => q.count), [2, 2, 1]);
});

test('frequentMealProducts is scoped to the requested meal category', () => {
  resetState();
  createProduct({ id: 'seed:kwark', name: 'Kwark', lastGrams: 250 });
  createProduct({ id: 'p2', name: 'Rijst', lastGrams: 150 });

  state.foods = {
    1: { ontbijt: [{ productId: 'seed:kwark', grams: 250, addedAt: 10 }], lunch: [{ productId: 'p2', grams: 150, addedAt: 20 }], snack: [], diner: [] },
    2: { ontbijt: [{ productId: 'seed:kwark', grams: 260, addedAt: 30 }], lunch: [{ productId: 'p2', grams: 175, addedAt: 40 }], snack: [], diner: [] }
  };

  assert.deepEqual(frequentMealProducts('lunch').map(q => [q.productId, q.grams]), [['p2', 175]]);
  assert.deepEqual(frequentMealProducts('ontbijt').map(q => [q.productId, q.grams]), [['seed:kwark', 260]]);
});

test('frequentMealProducts skips hidden and deleted products and limits output', () => {
  resetState();
  createProduct({ id: 'p1', name: 'Zichtbaar' });
  createProduct({ id: 'p2', name: 'Verborgen', hidden: true });
  createProduct({ id: 'p3', name: 'Verwijderd', deleted: true });
  createProduct({ id: 'p4', name: 'Tweede' });

  state.foods = {
    1: { ontbijt: [{ productId: 'p1', grams: 100, addedAt: 10 }, { productId: 'p2', grams: 100, addedAt: 20 }], lunch: [], snack: [], diner: [] },
    2: { ontbijt: [{ productId: 'p3', grams: 100, addedAt: 30 }, { productId: 'p4', grams: 120, addedAt: 40 }], lunch: [], snack: [], diner: [] }
  };

  assert.deepEqual(frequentMealProducts('ontbijt', 1).map(q => q.productId), ['p4']);
});

test('frequentMealProducts falls back to product lastGrams when log grams are empty', () => {
  resetState();
  createProduct({ id: 'p1', name: 'Shake', lastGrams: 330 });
  state.foods = {
    1: { ontbijt: [], lunch: [], snack: [{ productId: 'p1', grams: 0, addedAt: 10 }], diner: [] }
  };

  assert.equal(frequentMealProducts('snack')[0].grams, 330);
});
