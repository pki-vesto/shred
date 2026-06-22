import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../js/state.js';
import {
  createProduct,
  normalizeProductFields,
  productMatchRank,
  productMetaParts,
  updateProduct
} from '../js/nutrition.js';

function resetState() {
  Object.assign(state, {
    foods: {},
    products: {},
    mealTemplates: {},
    ts: {}
  });
}

test('normalizeProductFields trims barcode and label metadata', () => {
  assert.deepEqual(normalizeProductFields({
    name: '  Skyr aardbei  ',
    barcode: ' 8712 3456-7890 ',
    labelText: '  etiket   overgenomen  van verpakking '
  }), {
    name: 'Skyr aardbei',
    barcode: '871234567890',
    labelText: 'etiket overgenomen van verpakking'
  });
});

test('createProduct and updateProduct persist optional barcode and label text', () => {
  resetState();

  const product = createProduct({
    name: 'Magere kwark',
    barcode: ' 123 456 ',
    labelText: ' AH huismerk 500g ',
    kcalPer100g: 55,
    pPer100g: 10
  });

  assert.equal(product.barcode, '123456');
  assert.equal(product.labelText, 'AH huismerk 500g');
  assert.equal(state.products[product.id].barcode, '123456');
  assert.ok(state.ts.product[product.id]);

  updateProduct(product.id, { barcode: '', labelText: '  nieuw label  ' });

  assert.equal(product.barcode, null);
  assert.equal(product.labelText, 'nieuw label');
});

test('productMatchRank searches name, barcode and label metadata', () => {
  const product = {
    name: 'Skyr vanille',
    barcode: '8712345678901',
    labelText: 'Lidl Milbona high protein'
  };

  assert.equal(productMatchRank(product, 'skyr'), 1);
  assert.equal(productMatchRank(product, '871234'), 1);
  assert.equal(productMatchRank(product, '8712 3456'), 1);
  assert.equal(productMatchRank(product, 'milb'), 2);
  assert.equal(productMatchRank(product, 'protein'), 2);
  assert.equal(productMatchRank(product, 'kwark'), -1);
});

test('productMetaParts returns compact display metadata only when present', () => {
  assert.deepEqual(productMetaParts({ name: 'Ei' }), []);
  assert.deepEqual(productMetaParts({
    barcode: '871234',
    labelText: 'etiket gecontroleerd'
  }), ['barcode 871234', 'etiket gecontroleerd']);
});
