import { state, mutate } from '../state.js';
import { addPhoto, deletePhoto, hydratePhotoURLs } from '../photos.js';
import { todayNum, weekOf } from '../helpers.js';
import { confBadge, tick, toast } from './components.js';
import { weightData, weightMetrics, ewmaSeries, measurementTrend } from '../bodyMetrics.js';
import { confLevel } from '../dashboardMetrics.js';

export function renderBody() {
  const input = document.getElementById('weightInput');
  const today = todayNum();
  input.value = state.weights[today] || '';
  input.oninput = () => updateWeightHero(parseFloat(input.value));

  document.getElementById('weightSave').onclick = () => {
    const v = parseFloat(input.value);
    if (v >= 30 && v <= 300) {
      state.weights[today] = v;
      mutate('weights', String(today));
      renderWeightInsights();
      renderWeightChart();
      updateWeightHero(v);
      toast('Gewicht opgeslagen', 'success');
    } else {
      toast('Voer een gewicht tussen 30 en 300 kg in', 'error');
    }
  };

  updateWeightHero(state.weights[today]);
  renderWeightInsights();
  renderWeightChart();
  renderMeasurements(today);

  document.getElementById('photoWeekNum').textContent = weekOf(today);
  document.getElementById('photoInput').onchange = handlePhotoUpload;
  renderPhotos();
  // Foto's die alleen als metadata via sync binnenkwamen (van het andere
  // device) hebben nog geen blob; haal die lazily op en herteken zodra ze er
  // zijn.
  hydratePhotoURLs().then(changed => { if (changed) renderPhotos(); });
}

function updateWeightHero(v) {
  const hero = document.getElementById('wHero');
  const chip = document.getElementById('wDeltaChip');
  const metrics = weightMetrics(state.weights);
  const data = metrics.data;

  if (v && !isNaN(v)) {
    hero.textContent = v.toFixed(1);
    hero.classList.remove('empty');
  } else if (data.length) {
    hero.textContent = data[data.length - 1].w.toFixed(1);
    hero.classList.remove('empty');
  } else {
    hero.textContent = '—';
    hero.classList.add('empty');
  }

  if (data.length >= 1) {
    const delta = metrics.totalDelta;
    chip.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + ' kg';
    chip.className = 'delta-chip ' + (delta < -0.05 ? 'down' : delta > 0.05 ? 'up' : 'flat');
  } else {
    chip.textContent = '—';
    chip.className = 'delta-chip flat';
  }
}

function renderWeightInsights() {
  const wrap = document.getElementById('weightInsights');
  if (!wrap) return;

  const metrics = weightMetrics(state.weights);
  if (!metrics.latest) {
    wrap.innerHTML = `
      <div class="weight-insight empty">
        <div class="wi-label">Trend</div>
        <div class="wi-value">Nog geen data</div>
        <div class="wi-sub">Log gewicht om 7- en 14-daagse gemiddelden te zien.</div>
      </div>`;
    return;
  }

  const rate = metrics.ewmaTrendPerWeek;
  const trendClass = metrics.plateauV2 ? 'warn'
    : rate === null ? 'flat'
    : rate < -0.15 ? 'down'
    : rate > 0.15 ? 'up'
    : 'flat';
  const rateLabel = rate === null ? 'opbouwen' : `${signed(rate)} kg/wk`;

  const fc = metrics.forecast;
  const fcText = fc && fc.perWeek !== null && Math.abs(fc.perWeek) >= 0.05
    ? `Over 2 wk ~${fc.projected.toFixed(1)} kg bij deze trend.`
    : '';
  const plateauText = metrics.plateauV2 ? 'Trendgewicht ligt vlak over de laatste 2 weken.' : '';
  const c = metrics.consistency;
  const consText = c ? `Gewogen ${c.logged}/${c.window} dagen.` : '';
  const sub = [plateauText || fcText, consText].filter(Boolean).join(' ') || 'Trend bouwt op naarmate je meer logt.';

  const avg7 = metrics.avg7 === null ? '—' : metrics.avg7.toFixed(1);
  const avg14 = metrics.avg14 === null ? '—' : metrics.avg14.toFixed(1);

  wrap.innerHTML = `
    <div class="weight-insight ${trendClass}">
      <div class="wi-label">Trendgewicht</div>
      <div class="wi-value">${metrics.ewma.toFixed(1)} kg <span class="wi-rate">${rateLabel}</span></div>
      <div class="wi-sub">${sub}</div>
    </div>
    <div class="weight-mini">
      <div><span>${avg7}</span><small>7d gem.</small></div>
      <div><span>${avg14}</span><small>14d gem.</small></div>
    </div>`;
}

function signed(value) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
}

// ---- Metingen (#80/#81/#82) -------------------------------------------------

const MEASURE_FIELDS = [
  ['waist', 'Taille'], ['hip', 'Heup'], ['chest', 'Borst'], ['arm', 'Arm'], ['thigh', 'Dij']
];

function fmtCm(value) {
  return value.toFixed(1).replace('.', ',');
}

function signedCm(value) {
  return `${value >= 0 ? '+' : ''}${fmtCm(value)}`;
}

function renderMeasurementCards() {
  const cards = MEASURE_FIELDS.map(([key, label]) => {
    const trend = measurementTrend(state.measurements || {}, key);
    if (!trend.latest) return '';

    const delta = trend.totalDelta;
    const tone = delta < -0.05 ? 'down' : delta > 0.05 ? 'up' : 'flat';
    const rate = trend.count >= 2 && trend.trendPerWeek !== null
      ? `<span class="measure-card-rate ${tone}">${signedCm(trend.trendPerWeek)} cm/week</span>`
      : '<span class="measure-card-rate flat">Trend bouwt op</span>';
    const deltaText = delta === null ? '—' : `${signedCm(delta)} cm sinds start`;

    return `
      <div class="measure-card ${tone}">
        <div class="measure-card-top">
          <div class="measure-card-label">${label}</div>
          ${confBadge(confLevel(trend.count, 1, 3))}
        </div>
        <div class="measure-card-value">${fmtCm(trend.latest.v)}<small> cm</small></div>
        <div class="measure-card-sub">${deltaText}</div>
        ${rate}
      </div>`;
  }).filter(Boolean).join('');

  return cards ? `<div class="measure-cards" aria-label="Lichaamsmetingen">${cards}</div>` : '';
}

function renderMeasurements(today) {
  const wrap = document.getElementById('measureSection');
  if (!wrap) return;
  const cur = (state.measurements || {})[today] || {};

  const inputs = MEASURE_FIELDS.map(([key, label]) => `
    <div class="measure-cell">
      <label>${label}</label>
      <div class="measure-input"><input type="number" step="0.1" inputmode="decimal" id="m-${key}" value="${cur[key] ?? ''}" placeholder="—"><span>cm</span></div>
    </div>`).join('');
  const cardsHtml = renderMeasurementCards();

  wrap.innerHTML = `
    <div class="measure-grid">${inputs}</div>
    <button class="btn-primary" id="measureSave">Metingen opslaan (dag ${today})</button>
    ${cardsHtml}
    <div class="measure-hint">Meet nuchter, op dezelfde plek. Taille is bij recompositie vaak een scherper signaal dan de weegschaal.</div>`;

  document.getElementById('measureSave').onclick = () => {
    const rec = {};
    for (const [key] of MEASURE_FIELDS) {
      const v = parseFloat(document.getElementById('m-' + key).value);
      if (Number.isFinite(v) && v > 0 && v < 400) rec[key] = v;
    }
    if (Object.keys(rec).length) state.measurements[today] = rec;
    else delete state.measurements[today];
    mutate('measurements', String(today));
    renderMeasurements(today);
    tick(10);
    toast('Metingen opgeslagen', 'success');
  };
}

function renderWeightChart() {
  const wrap = document.getElementById('chartWrap');
  const bars = document.getElementById('deltaBars');
  const data = weightData(state.weights);

  if (!data.length) {
    wrap.innerHTML = '<div class="chart-empty"><div class="big">Nog geen gewicht gelogd</div><div class="sub">Voer vanochtend je eerste gewicht in.<br>De trend tekent zich vanzelf uit.</div></div>';
    bars.innerHTML = '';
    return;
  }

  // Re-build the svg+tooltip if the empty state replaced them.
  if (!wrap.querySelector('svg.line')) {
    wrap.innerHTML = '<svg class="line" viewBox="0 0 340 168"></svg><div class="chart-tooltip" id="chartTip"></div>';
  }
  const svg = wrap.querySelector('svg.line');

  const W = 340, H = 168, padL = 30, padR = 12, padT = 14, padB = 20;
  const minW = Math.min(...data.map(d => d.w)) - 0.4;
  const maxW = Math.max(...data.map(d => d.w)) + 0.4;
  const range = maxW - minW || 1;
  const maxDay = Math.max(todayNum(), ...data.map(d => d.day));
  const xFor = day => padL + (day - 1) / Math.max(maxDay - 1, 1) * (W - padL - padR);
  const yFor = w => H - padB - (w - minW) / range * (H - padT - padB);

  // Trendgewicht (EWMA) — gladder en gap-aware t.o.v. een simpel 7-daags venster.
  const avg = ewmaSeries(data);

  // Grid + y labels
  let g = '';
  for (let i = 0; i <= 3; i++) {
    const y = padT + i / 3 * (H - padT - padB);
    const val = (maxW - i / 3 * range).toFixed(1);
    g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
    g += `<text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="var(--text-4)" font-weight="600">${val}</text>`;
  }

  // Deload week shading
  let shade = '';
  [[29, 35], [64, 70]].forEach(([a, b]) => {
    const x1 = xFor(a), x2 = xFor(b);
    if (b <= maxDay + 1) shade += `<rect x="${x1}" y="${padT}" width="${x2 - x1}" height="${H - padT - padB}" fill="var(--blue-soft)"/>`;
  });

  // Trend (linear regression)
  const nn = data.length;
  const sx = data.reduce((s, d) => s + d.day, 0);
  const sy = data.reduce((s, d) => s + d.w, 0);
  const sxy = data.reduce((s, d) => s + d.day * d.w, 0);
  const sxx = data.reduce((s, d) => s + d.day * d.day, 0);
  let trend = '';
  if (nn >= 2) {
    const slope = (nn * sxy - sx * sy) / (nn * sxx - sx * sx) || 0;
    const intc = (sy - slope * sx) / nn;
    trend = `<line x1="${xFor(1)}" y1="${yFor(intc + slope * 1)}" x2="${xFor(maxDay)}" y2="${yFor(intc + slope * maxDay)}" stroke="var(--text-4)" stroke-dasharray="2,4" stroke-width="1.2"/>`;
  }

  const avgLine = avg.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(d.day).toFixed(1)} ${yFor(d.w).toFixed(1)}`).join(' ');
  const area = `${avgLine} L ${xFor(avg[avg.length - 1].day).toFixed(1)} ${H - padB} L ${xFor(avg[0].day).toFixed(1)} ${H - padB} Z`;
  const dots = data.map(d => `<circle cx="${xFor(d.day).toFixed(1)}" cy="${yFor(d.w).toFixed(1)}" r="2.6" fill="var(--text-3)"/>`).join('');
  const lastPt = avg[avg.length - 1];
  const lastDot = `<circle cx="${xFor(lastPt.day).toFixed(1)}" cy="${yFor(lastPt.w).toFixed(1)}" r="4.5" fill="var(--amber)" stroke="var(--bg)" stroke-width="2"/>`;

  svg.innerHTML = `<defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--amber)" stop-opacity="0.18"/>
      <stop offset="1" stop-color="var(--amber)" stop-opacity="0"/>
    </linearGradient></defs>
    ${shade}${g}${trend}<path d="${area}" fill="url(#ag)"/>
    <path d="${avgLine}" fill="none" stroke="var(--amber)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${lastDot}`;

  // Animate the moving-average line draw
  const path = svg.querySelector('path[stroke]');
  try {
    const len = path.getTotalLength();
    path.animate(
      [{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }],
      { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  } catch {}

  // Touch tooltip
  const tip = document.getElementById('chartTip');
  function showAt(clientX) {
    const rect = svg.getBoundingClientRect();
    const vx = (clientX - rect.left) / rect.width * W;
    let nearest = data[0], best = 1e9;
    data.forEach(d => { const dx = Math.abs(xFor(d.day) - vx); if (dx < best) { best = dx; nearest = d; } });
    const px = xFor(nearest.day) / W * rect.width;
    const py = yFor(nearest.w) / H * rect.height;
    tip.style.left = px + 'px';
    tip.style.top = py + 'px';
    tip.style.opacity = '1';
    tip.innerHTML = `${nearest.w.toFixed(1)} kg<span class="tt-date">dag ${nearest.day}</span>`;
  }
  svg.onpointerdown = e => showAt(e.clientX);
  svg.onpointermove = e => { if (e.buttons || e.pointerType === 'touch') showAt(e.clientX); };
  svg.onpointerleave = () => { tip.style.opacity = '0'; };
  svg.onpointerup = () => setTimeout(() => tip.style.opacity = '0', 1200);

  // Weekly delta bars
  const byWeek = {};
  data.forEach(d => { const w = weekOf(d.day); (byWeek[w] = byWeek[w] || []).push(d.w); });
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
  const weekAvg = weeks.map(w => ({ w, avg: byWeek[w].reduce((s, x) => s + x, 0) / byWeek[w].length }));
  const deltas = weekAvg.map((wk, i) => ({ w: wk.w, d: i === 0 ? 0 : wk.avg - weekAvg[i - 1].avg }));
  const maxAbs = Math.max(0.1, ...deltas.map(x => Math.abs(x.d)));
  bars.innerHTML = deltas.map(x => {
    const h = Math.abs(x.d) / maxAbs * 30;
    return `<div class="wk"><div class="stick ${x.d > 0.02 ? 'gain' : ''}" style="height:${x.d === 0 ? 2 : h}px"></div><div class="n">W${x.w}</div></div>`;
  }).join('');
}

async function handlePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const blob = await compressImage(file, 800);
  await addPhoto({ week: weekOf(todayNum()), blob, mime: blob.type });
  renderPhotos();
  e.target.value = '';
  toast('Foto opgeslagen', 'success');
}

function compressImage(file, maxWidth) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = img.width * scale, h = img.height * scale;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.75);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  const grid = document.getElementById('photoGrid');
  const allPhotos = [];
  Object.keys(state.photos).sort((a, b) => +b - +a).forEach(wk => {
    state.photos[wk].forEach(p => allPhotos.push({ wk: +wk, ...p }));
  });
  if (!allPhotos.length) {
    grid.innerHTML = '<div class="photos-empty"><div class="big">Begin met week 1</div><div class="sub">Eén foto per week. Over 13 weken zie je het verschil dat de spiegel mist.</div></div>';
    return;
  }
  grid.innerHTML = allPhotos.map(p => `
    <div class="photo-item${p.dataUrl ? '' : ' loading'}" data-photo="${p.id}">
      ${p.dataUrl ? `<img src="${p.dataUrl}" alt="Week ${p.wk}">` : `<div class="photo-pending">laden…</div>`}
      <div class="photo-week"><small>Week</small>${p.wk}</div>
      <button class="photo-del" data-del-photo="${p.id}">✕</button>
    </div>
  `).join('');
  grid.querySelectorAll('[data-photo]').forEach(el => {
    el.onclick = (e) => {
      if (e.target.dataset.delPhoto) return;
      const id = +el.dataset.photo;
      const photo = allPhotos.find(p => p.id === id);
      if (!photo || !photo.dataUrl) return;   // nog aan het laden
      document.getElementById('photoViewerImg').src = photo.dataUrl;
      document.getElementById('photoViewer').classList.add('open');
    };
  });
  grid.querySelectorAll('[data-del-photo]').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Foto verwijderen?')) return;
      await deletePhoto(+b.dataset.delPhoto);
      renderPhotos();
    };
  });
}
