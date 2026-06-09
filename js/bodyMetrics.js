export function weightData(weights) {
  return Object.keys(weights || {})
    .map(day => ({ day: Number(day), w: Number(weights[day]) }))
    .filter(d => Number.isFinite(d.day) && Number.isFinite(d.w))
    .sort((a, b) => a.day - b.day);
}

export function averageWindow(data, endDay, days) {
  const fromDay = endDay - days + 1;
  const win = data.filter(d => d.day >= fromDay && d.day <= endDay);
  if (!win.length) return null;
  return win.reduce((sum, d) => sum + d.w, 0) / win.length;
}

export function linearTrendPerWeek(data) {
  if (data.length < 2) return null;
  const n = data.length;
  const sx = data.reduce((s, d) => s + d.day, 0);
  const sy = data.reduce((s, d) => s + d.w, 0);
  const sxy = data.reduce((s, d) => s + d.day * d.w, 0);
  const sxx = data.reduce((s, d) => s + d.day * d.day, 0);
  const denom = n * sxx - sx * sx;
  if (!denom) return 0;
  return ((n * sxy - sx * sy) / denom) * 7;
}

// Exponentieel gewogen voortschrijdend gemiddelde (trendgewicht). Gap-aware:
// de demping schaalt met het aantal dagen tussen weegmomenten, zodat
// onregelmatig wegen het trendgewicht niet vertekent. halfLifeDays = na hoeveel
// dagen een afwijking voor de helft is "vergeten".
export function ewmaSeries(data, halfLifeDays = 10) {
  if (!data.length) return [];
  const out = [{ day: data[0].day, w: data[0].w }];
  let ewma = data[0].w;
  for (let i = 1; i < data.length; i++) {
    const gap = Math.max(1, data[i].day - data[i - 1].day);
    const alpha = 1 - Math.pow(0.5, gap / halfLifeDays);
    ewma = ewma + alpha * (data[i].w - ewma);
    out.push({ day: data[i].day, w: ewma });
  }
  return out;
}

// Weeg-consistentie over de laatste `windowDays` dagen: fractie van mogelijke
// dagen waarop daadwerkelijk gewogen is (dag 1 is de vroegst mogelijke).
export function weighInConsistency(data, endDay, windowDays = 14) {
  const from = endDay - windowDays + 1;
  const logged = new Set(data.filter(d => d.day >= from && d.day <= endDay).map(d => d.day));
  const possible = Math.min(windowDays, endDay);
  return { logged: logged.size, window: possible, score: possible > 0 ? logged.size / possible : 0 };
}

// Lineaire extrapolatie van het EWMA-trendgewicht `aheadDays` vooruit. Geen
// hard doel, geen TDEE-aanname — puur de huidige trend doorgetrokken.
export function trendForecast(data, halfLifeDays = 10, aheadDays = 14) {
  const e = ewmaSeries(data, halfLifeDays);
  if (e.length < 2) return null;
  const latest = e[e.length - 1];
  const recent = e.filter(p => p.day >= latest.day - 13);
  const perWeek = linearTrendPerWeek(recent);
  const perDay = perWeek === null ? 0 : perWeek / 7;
  return { current: latest.w, perWeek, aheadDays, projected: latest.w + perDay * aheadDays };
}

// Reeks meetwaarden voor één veld (waist/hip/chest/arm/thigh), oplopend op dag.
export function measurementSeries(measurements, field) {
  return Object.keys(measurements || {})
    .map(day => ({ day: Number(day), v: Number(measurements[day]?.[field]) }))
    .filter(d => Number.isFinite(d.day) && Number.isFinite(d.v) && d.v > 0)
    .sort((a, b) => a.day - b.day);
}

// Laatste waarde + totale delta + trend per week (over ~4 weken) voor één veld.
export function measurementTrend(measurements, field) {
  const data = measurementSeries(measurements, field);
  if (!data.length) return { latest: null, totalDelta: null, trendPerWeek: null, count: 0 };
  const latest = data[data.length - 1];
  const recent = data.filter(d => d.day >= latest.day - 27);
  return {
    latest,
    totalDelta: latest.v - data[0].v,
    trendPerWeek: linearTrendPerWeek(recent.map(d => ({ day: d.day, w: d.v }))),
    count: data.length
  };
}

export function weightMetrics(weights) {
  const data = weightData(weights);
  if (!data.length) {
    return {
      data,
      latest: null,
      totalDelta: null,
      avg7: null,
      avg14: null,
      avg7Delta: null,
      trendPerWeek: null,
      plateau: false,
      ewma: null,
      ewmaTrendPerWeek: null,
      consistency: null,
      forecast: null,
      plateauV2: false
    };
  }

  const latest = data[data.length - 1];
  const avg7 = averageWindow(data, latest.day, 7);
  const avg14 = averageWindow(data, latest.day, 14);
  const prevAvg7 = averageWindow(data, latest.day - 7, 7);
  const recent14 = data.filter(d => d.day >= latest.day - 13 && d.day <= latest.day);
  const trendPerWeek = linearTrendPerWeek(recent14);
  const avg7Delta = avg7 !== null && prevAvg7 !== null ? avg7 - prevAvg7 : null;
  const spanDays = latest.day - data[0].day + 1;
  const plateau = spanDays >= 14 && avg7Delta !== null && avg7Delta > -0.2 && trendPerWeek !== null && trendPerWeek > -0.2;

  // EWMA-trendgewicht + afgeleiden (plateau v2 op basis van de gladde trend).
  const ewmaArr = ewmaSeries(data);
  const ewma = ewmaArr[ewmaArr.length - 1].w;
  const recentEwma = ewmaArr.filter(p => p.day >= latest.day - 13);
  const ewmaTrendPerWeek = linearTrendPerWeek(recentEwma);
  const consistency = weighInConsistency(data, latest.day, 14);
  const forecast = trendForecast(data);
  const plateauV2 = spanDays >= 14 && ewmaTrendPerWeek !== null && Math.abs(ewmaTrendPerWeek) < 0.1;

  return {
    data,
    latest,
    totalDelta: latest.w - data[0].w,
    avg7,
    avg14,
    avg7Delta,
    trendPerWeek,
    plateau,
    ewma,
    ewmaArr,
    ewmaTrendPerWeek,
    consistency,
    forecast,
    plateauV2
  };
}
