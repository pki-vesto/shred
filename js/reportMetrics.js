// Pure rapport-helpers — leiden afgeleide cijfers uit een snapshot van
// {weights, measurements, photos}. Read-only, geen I/O, geen Date.now().
//
// `bodyComparison(fromDay, toDay, snap)` is de "voor → na" voor het faserapport
// (#35): trendgewicht aan beide kanten van het venster, beschikbare metingen en
// het dichtstbijzijnde foto-paar — plus een confidence op basis van
// weeg-consistentie.

import { weightData, ewmaSeries, measurementSeries, weighInConsistency } from './bodyMetrics.js';
import { confLevel } from './dashboardMetrics.js';

// Antropometrische metingen die in het "voor → na" blok mogen verschijnen, met
// NL-labels. Volgorde = volgorde in het rapport.
export const COMPARISON_MEASURE_FIELDS = [
  ['waist', 'Taille'],
  ['hip', 'Heup'],
  ['chest', 'Borst'],
  ['arm', 'Arm'],
  ['thigh', 'Dij']
];

// Hoe ver een EWMA-anker maximaal van het anker-dagnummer mag liggen om als
// "betrouwbaar genoeg" te tellen. Verder weg → liever geen waarde tonen dan
// een schijn-precieze waarde aan de verkeerde kant van de fase.
const EWMA_MAX_GAP_DAYS = 3;

// Selecteer voor elk gevraagd dagnummer de dichtstbijzijnde foto. State slaat
// foto's op per week (week 1-13), dus we benaderen het dagnummer met het
// midden van de week. Retourneert null als er geen passende foto is.
//
// `photos` is `state.photos`: { [wkString]: [{ id, ts, dataUrl?, ...meta }] }.
// `dataUrl` blijft beschikbaar in het resultaat als hij in de snapshot stond,
// zodat de UI direct kan renderen zonder opnieuw te hydrateren.
//
// Window-discipline: een "voor"-foto mag niet na `toDay` liggen en een "na"-
// foto niet (ver) vóór `fromDay`. Anders krijgen we een misleidende
// vergelijking als er buiten het venster wél foto's zijn maar erbinnen niet.
export function pickPhotoPair(fromDay, toDay, photos) {
  const all = [];
  for (const wk in (photos || {})) {
    for (const p of photos[wk] || []) {
      if (!p || p.deleted) continue;
      all.push({
        id: p.id,
        wk: Number(wk),
        ts: p.ts,
        dataUrl: p.dataUrl,
        day: photoDayProxy(Number(wk))
      });
    }
  }
  if (!all.length) return { from: null, to: null };

  const slack = Math.max(7, Math.floor((toDay - fromDay) / 2));
  const fromCandidates = all.filter(p => p.day <= toDay);
  const from = fromCandidates.length ? pickClosest(fromCandidates, fromDay) : null;

  const toCandidates = all
    .filter(p => p.day >= fromDay && p.day <= toDay + slack)
    .filter(p => !from || p.id !== from.id);
  const to = toCandidates.length ? pickClosest(toCandidates, toDay) : null;

  return { from, to };
}

// Week 1 → dag 4, week 2 → dag 11, etc. — middendag is de eerlijkste proxy.
function photoDayProxy(wk) {
  return (wk - 1) * 7 + 4;
}

function pickClosest(items, anchorDay) {
  let best = items[0];
  let bestGap = Math.abs(best.day - anchorDay);
  for (let i = 1; i < items.length; i++) {
    const gap = Math.abs(items[i].day - anchorDay);
    if (gap < bestGap) { best = items[i]; bestGap = gap; }
  }
  return best;
}

function nearestEwmaPoint(ewma, anchorDay) {
  if (!ewma.length) return null;
  let best = ewma[0];
  let bestGap = Math.abs(best.day - anchorDay);
  for (let i = 1; i < ewma.length; i++) {
    const gap = Math.abs(ewma[i].day - anchorDay);
    if (gap < bestGap) { best = ewma[i]; bestGap = gap; }
  }
  if (bestGap > EWMA_MAX_GAP_DAYS) return null;
  return { day: best.day, w: Math.round(best.w * 10) / 10 };
}

// Voor een meetreeks (oplopend op dag): pak de eerste op-of-na fromDay als
// startpunt en de laatste op-of-vóór toDay als eindpunt. Mist er één → null.
function bookendPoints(series, fromDay, toDay) {
  if (!series.length) return null;
  const from = series.find(p => p.day >= fromDay);
  let to = null;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].day <= toDay) { to = series[i]; break; }
  }
  if (!from || !to) return null;
  if (from.day > toDay || to.day < fromDay) return null;
  if (from.day === to.day) return null; // geen vergelijking mogelijk
  return { from, to };
}

// Hoofd-helper: bouw een "voor → na" snapshot voor het rapport.
// `snap` = { weights, measurements, photos } — bv. de live `state`.
export function bodyComparison(fromDay, toDay, snap) {
  const safeFrom = Math.max(1, Math.floor(fromDay));
  const safeTo = Math.max(safeFrom, Math.floor(toDay));
  const spanDays = safeTo - safeFrom;

  const weights = weightData(snap?.weights || {});
  const weightsInWindow = weights.filter(d => d.day >= safeFrom && d.day <= safeTo);
  const ewma = ewmaSeries(weights);

  const wFrom = nearestEwmaPoint(ewma, safeFrom);
  const wTo = nearestEwmaPoint(ewma, safeTo);
  let deltaKg = null;
  let kgPerWeek = null;
  if (wFrom && wTo) {
    deltaKg = Math.round((wTo.w - wFrom.w) * 10) / 10;
    if (spanDays >= 7) {
      kgPerWeek = Math.round(((wTo.w - wFrom.w) / spanDays * 7) * 10) / 10;
    }
  }

  const measurements = [];
  for (const [key, label] of COMPARISON_MEASURE_FIELDS) {
    const series = measurementSeries(snap?.measurements || {}, key);
    const bookends = bookendPoints(series, safeFrom, safeTo);
    if (!bookends) continue;
    measurements.push({
      key,
      label,
      from: { day: bookends.from.day, v: bookends.from.v },
      to: { day: bookends.to.day, v: bookends.to.v },
      deltaCm: Math.round((bookends.to.v - bookends.from.v) * 10) / 10
    });
  }

  const photos = pickPhotoPair(safeFrom, safeTo, snap?.photos || {});

  // Confidence: hoe vaak is er in dit venster gewogen? `weighInConsistency`
  // werkt vanuit een eind-dag en een window-lengte, dus we mappen het
  // [from, to]-bereik daar 1-op-1 op.
  const windowDays = Math.max(1, safeTo - safeFrom + 1);
  const consistency = weighInConsistency(weights, safeTo, windowDays);
  const confidence = confLevel(weightsInWindow.length, 2, 5);
  const indicative = confidence !== 'high';

  return {
    fromDay: safeFrom,
    toDay: safeTo,
    spanDays,
    weight: { from: wFrom, to: wTo, deltaKg, kgPerWeek },
    measurements,
    photos,
    consistency,
    confidence,
    indicative
  };
}
