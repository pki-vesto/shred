import { dateForDay } from './helpers.js';
import { CATEGORY_KEYS, macrosFor } from './nutrition.js';

export function buildNutritionCsv(appState) {
  const rows = [['dag', 'datum', 'maaltijd', 'product', 'grams', 'kcal', 'eiwit', 'koolh', 'vet']];
  const foods = appState.foods || {};
  const products = appState.products || {};
  const days = Object.keys(foods).map(Number).filter(Number.isFinite).sort((a, b) => a - b);

  for (const day of days) {
    for (const meal of CATEGORY_KEYS) {
      for (const item of foods[day]?.[meal] || []) {
        const product = products[item.productId] || null;
        const grams = Number(item.grams) || 0;
        const macros = macrosFor(product, grams);
        rows.push([
          day,
          isoDateForDay(day),
          meal,
          product?.name || '(onbekend product)',
          fixed(grams),
          fixed(macros.kcal),
          fixed(macros.p),
          fixed(macros.c),
          fixed(macros.f)
        ]);
      }
    }
  }

  return rows.length > 1 ? toCsv(rows) : '';
}

export function buildBodyCsv(appState) {
  const rows = [['dag', 'datum', 'gewicht_kg', 'taille', 'heup', 'borst', 'arm', 'dij']];
  const weights = appState.weights || {};
  const measurements = appState.measurements || {};
  const days = new Set([
    ...Object.keys(weights).map(Number).filter(Number.isFinite),
    ...Object.keys(measurements).map(Number).filter(Number.isFinite)
  ]);

  for (const day of [...days].sort((a, b) => a - b)) {
    const measurement = measurements[day] || {};
    rows.push([
      day,
      isoDateForDay(day),
      valueOrEmpty(weights[day]),
      valueOrEmpty(measurement.waist),
      valueOrEmpty(measurement.hip),
      valueOrEmpty(measurement.chest),
      valueOrEmpty(measurement.arm),
      valueOrEmpty(measurement.thigh)
    ]);
  }

  return rows.length > 1 ? toCsv(rows) : '';
}

export function csvFilename(domain, date = new Date()) {
  return `shred-${domain}-${localIsoDate(date)}.csv`;
}

function isoDateForDay(day) {
  return localIsoDate(dateForDay(day));
}

function localIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fixed(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : '';
}

function valueOrEmpty(value) {
  return value === undefined || value === null || value === '' ? '' : fixed(value);
}

function toCsv(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\n') + '\n';
}

function csvCell(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
