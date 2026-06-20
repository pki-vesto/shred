import { state, saveState } from '../state.js';
import { SESSIONS, sessionFor } from '../sessions.js';
import { TOTAL_DAYS, dateForDay, todayNum, dayIsComplete, isHardcodedDeload, weekOf, resolveSlots, shortDate } from '../helpers.js';
import { dashboardKpis, weeklyReview, macroWeeklySeries, goalPace, calorieVsWeight, nutritionScoreForDay, trainingHeatmapStatus, nutritionContextSplit, confLevel, confLabelOf, programPhases, fullProgramRange, phaseReport } from '../dashboardMetrics.js';
import { confBadge } from './components.js';
import { weeklyVolume, kneeLoadForSession, weekPRSummary, weeklyVolumeSeries, prTimeline, PR_LABELS } from '../trainingMetrics.js';

export function renderOverview(switchTab) {
  let kracht = 0, cardio = 0;
  for (let i = 1; i <= TOTAL_DAYS; i++) {
    const code = sessionFor(dateForDay(i));
    if (!dayIsComplete(i)) continue;
    if (code.startsWith('K')) kracht++;
    else if (code.startsWith('C')) cardio++;
  }
  document.getElementById('sKracht').textContent = kracht;
  document.getElementById('sCardio').textContent = cardio;

  let streak = 0;
  for (let i = todayNum(); i >= 1; i--) {
    if (dayIsComplete(i)) streak++; else break;
  }
  document.getElementById('sStreak').textContent = streak;
  renderDashboard();
  renderTrainingIntel();
  renderProgressIntel();
  renderHeatmaps(switchTab);
  renderPhaseReport();

  const content = document.getElementById('overviewContent');
  const today = todayNum();
  let html = '';
  for (let w = 0; w < 13; w++) {
    const weekStart = w * 7 + 1;
    const isDel = isHardcodedDeload(weekStart) || isHardcodedDeload(weekStart + 3) || state.suggestedDeload['w' + (w + 1)] === true;
    html += `<div class="dna-week ${isDel ? 'deload' : ''}">
      <div class="wk-label">W${w + 1}${isDel ? '<small>deload</small>' : ''}</div>`;
    for (let d = 0; d < 7; d++) {
      const dayN = weekStart + d;
      if (dayN > TOTAL_DAYS) { html += '<div class="cell empty"></div>'; continue; }
      const code = sessionFor(dateForDay(dayN));
      const shape = code.startsWith('K') ? 'str' : code.startsWith('C') ? 'car' : 'rst';
      let cls = 'cell ' + shape;
      if (dayIsComplete(dayN)) cls += ' done';
      if (dayN === today) cls += ' today';
      if (dayN > today) cls += ' future';
      html += `<div class="${cls}" data-day="${dayN}" title="Dag ${dayN}"><span class="glyph"></span></div>`;
    }
    html += `</div>`;
  }
  content.innerHTML = html;
  content.querySelectorAll('.cell[data-day]').forEach(el => {
    el.onclick = () => {
      state.viewDay = +el.dataset.day;
      saveState();
      switchTab('today');
    };
  });
}

function renderDashboard() {
  const kpiWrap = document.getElementById('dashboardKpis');
  const reviewWrap = document.getElementById('weeklyReview');
  if (!kpiWrap || !reviewWrap) return;

  kpiWrap.innerHTML = dashboardKpis().map(kpi => `
    <div class="kpi ${kpi.tone}">
      <div class="kpi-label">${kpi.label} ${confBadge(kpi.confidence)}</div>
      <div class="kpi-value">${kpi.value}</div>
      <div class="kpi-sub">${kpi.sub}</div>
    </div>
  `).join('');

  const review = weeklyReview();
  reviewWrap.innerHTML = `
    <div class="review-head">
      <h3>Week ${review.week.week} rapport</h3>
      <span>${review.week.start}-${review.week.end}</span>
    </div>
    <div class="review-list">
      ${review.items.map(item => `
        <div class="review-item ${item.tone}">
          <div class="ri-dot"></div>
          <div><b>${item.title} ${confBadge(item.confidence)}</b><span>${item.text}</span></div>
        </div>
      `).join('')}
    </div>
    ${review.recommendation ? `<div class="review-rec"><span class="rr-ic">→</span><span>${review.recommendation}</span></div>` : ''}`;
}

let phaseReportSelection = 'phase-1';

function phaseReportRanges() {
  return [...programPhases(), fullProgramRange()];
}

function selectedPhaseRange() {
  const ranges = phaseReportRanges();
  return ranges.find(r => r.key === phaseReportSelection) || ranges[0] || null;
}

function renderPhaseReport() {
  const section = document.getElementById('phaseReportSection');
  const select = document.getElementById('phaseReportPeriod');
  const header = document.getElementById('phaseReportHeader');
  const empty = document.getElementById('phaseReportEmpty');
  const cards = document.getElementById('phaseReportCards');
  if (!section || !select || !header || !empty || !cards) return;

  const ranges = phaseReportRanges();
  if (!ranges.length) {
    header.textContent = '';
    cards.innerHTML = '';
    empty.textContent = 'Programmaperiodes zijn nog niet beschikbaar.';
    empty.hidden = false;
    return;
  }

  if (!ranges.some(r => r.key === phaseReportSelection)) phaseReportSelection = ranges[0].key;
  select.innerHTML = ranges.map(r => `<option value="${r.key}" ${r.key === phaseReportSelection ? 'selected' : ''}>${r.label}</option>`).join('');
  select.onchange = () => {
    phaseReportSelection = select.value;
    renderPhaseReport();
  };

  const range = selectedPhaseRange();
  const report = phaseReport(range);
  if (!report.range) {
    header.textContent = '';
    cards.innerHTML = '';
    empty.textContent = 'Deze periode kan niet worden geladen.';
    empty.hidden = false;
    return;
  }

  header.textContent = `${report.range.label} · ${shortDate(report.range.start)} - ${shortDate(report.range.end)}`;
  const missingCount = report.domains.filter(d => d.empty || d.confidence === 'low').length;
  empty.hidden = missingCount === 0;
  empty.textContent = missingCount
    ? 'Dunne of ontbrekende data wordt hier expliciet zo getoond; dat is geen negatieve score.'
    : '';

  cards.innerHTML = report.domains.map(domain => `
    <article class="phase-card ${domain.tone || 'neutral'} ${domain.empty ? 'empty' : ''}">
      <div class="phase-card-top">
        <div>
          <div class="phase-card-title">${domain.title} ${phaseConfidenceBadge(domain.confidence)}</div>
          <div class="phase-card-value">${domain.value}${domain.unit ? `<small>${domain.unit}</small>` : ''}</div>
        </div>
        <span class="phase-trend ${trendClass(domain)}" title="Zekerheid: ${confLabelOf(domain.confidence) || 'betrouwbaar'}">${domain.trend}</span>
      </div>
      <div class="phase-card-metrics">
        ${(domain.metrics || []).map(metric => `<span>${metric}</span>`).join('')}
      </div>
    </article>
  `).join('');
}

function trendClass(domain) {
  if (domain.empty) return 'flat';
  if (domain.tone === 'good') return 'up';
  if (domain.tone === 'warn' || domain.tone === 'bad') return 'down';
  return 'flat';
}

function phaseConfidenceBadge(level) {
  const label = confLabelOf(level);
  if (!label) return '';
  const cls = level === 'low' ? 'bad' : level === 'medium' ? 'warn' : 'good';
  return `<span class="conf-badge ${cls}" title="Zekerheid: ${label}">${label}</span>`;
}

// ---- Trainingsintelligentie -------------------------------------------------

function fmtVol(v) {
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'k';
  return Math.round(v).toString();
}

function deltaChip(delta) {
  if (delta === null) return '<span class="ti-delta flat">eerste week</span>';
  const pct = Math.round(delta * 100);
  const tone = pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat';
  const sign = pct > 0 ? '+' : '';
  return `<span class="ti-delta ${tone}">${sign}${pct}% vs vorige week</span>`;
}

function fmtMacro(n, suffix) {
  return n === null ? '—' : `${Math.round(n)}${suffix}`;
}

function contextDelta(a, b, posLabel, negLabel) {
  if (!a.days || !b.days) return 'te weinig data';
  const diff = Math.round(a.avgKcal - b.avgKcal);
  if (Math.abs(diff) < 25) return 'nagenoeg gelijk';
  return `${diff > 0 ? '+' : ''}${diff} kcal ${diff > 0 ? posLabel : negLabel}`;
}

function contextRow(leftLabel, left, rightLabel, right, deltaText) {
  const conf = confBadge(confLevel(Math.min(left.days, right.days), 1, 3));
  return `
    <div class="ti-context-row">
      <div>
        <b>${leftLabel} vs ${rightLabel} ${conf}</b>
        <span>${left.days}/${right.days} gelogde dagen · ${fmtMacro(left.avgKcal, ' kcal')} / ${fmtMacro(right.avgKcal, ' kcal')} · ${fmtMacro(left.avgProtein, ' g')} / ${fmtMacro(right.avgProtein, ' g')} eiwit</span>
      </div>
      <span class="ti-delta flat">${deltaText}</span>
    </div>`;
}

const KNEE_BAND = {
  low:    { tone: 'good', label: 'Laag',   text: 'Vooral knievriendelijke arbeid.' },
  medium: { tone: 'warn', label: 'Matig',  text: 'Directe quad-belasting deze sessie.' },
  high:   { tone: 'bad',  label: 'Hoog',   text: 'Knie-onvriendelijke oefening(en) belast.' }
};

let heatmapLayer = 'training';

const TRAINING_HM = {
  done: ['done', 'Voltooid'],
  missed: ['missed', 'Gemist'],
  pending: ['pending', 'Vandaag open'],
  rest: ['rest', 'Rustdag'],
  future: ['future', 'Toekomst']
};

function nutritionBand(score) {
  if (score === null) return ['missing', 'Niet gelogd'];
  if (score >= 85) return ['high', `${Math.round(score)}% compliance`];
  if (score >= 70) return ['mid', `${Math.round(score)}% compliance`];
  if (score >= 45) return ['low', `${Math.round(score)}% compliance`];
  return ['bad', `${Math.round(score)}% compliance`];
}

function renderHeatmaps(switchTab) {
  const wrap = document.getElementById('heatmapIntel');
  if (!wrap) return;
  const today = todayNum();
  let grid = '';
  for (let w = 0; w < 13; w++) {
    const weekStart = w * 7 + 1;
    grid += `<div class="hm-week"><div class="hm-week-label">W${w + 1}</div>`;
    for (let d = 0; d < 7; d++) {
      const day = weekStart + d;
      if (day > TOTAL_DAYS) { grid += '<div class="hm-cell empty"></div>'; continue; }
      if (heatmapLayer === 'training') {
        const status = trainingHeatmapStatus(day, today);
        const meta = TRAINING_HM[status];
        grid += `<button class="hm-cell hm-training ${meta[0]}" data-day="${day}" title="Dag ${day}: ${meta[1]}"></button>`;
      } else {
        const future = day > today;
        const score = future ? null : nutritionScoreForDay(day);
        const band = future ? ['future', 'Toekomst'] : nutritionBand(score);
        grid += `<button class="hm-cell hm-nutrition ${band[0]}" data-day="${day}" title="Dag ${day}: ${band[1]}"></button>`;
      }
    }
    grid += '</div>';
  }
  wrap.innerHTML = `
    <div class="ti-head">
      <h3>90-dagen heatmap</h3>
      <span>${heatmapLayer === 'training' ? 'training' : 'voeding'}</span>
    </div>
    <div class="heatmap-card">
      <div class="hm-controls" role="group" aria-label="Heatmap-laag">
        <button class="${heatmapLayer === 'training' ? 'active' : ''}" data-layer="training">Training</button>
        <button class="${heatmapLayer === 'nutrition' ? 'active' : ''}" data-layer="nutrition">Voeding</button>
      </div>
      <div class="hm-grid">${grid}</div>
      <div class="hm-legend">
        ${heatmapLayer === 'training'
          ? '<span><i class="done"></i>Voltooid</span><span><i class="missed"></i>Gemist</span><span><i class="rest"></i>Rust</span><span><i class="future"></i>Toekomst</span>'
          : '<span><i class="high"></i>Hoog</span><span><i class="mid"></i>Oké</span><span><i class="low"></i>Laag</span><span><i class="missing"></i>Niet gelogd</span>'}
      </div>
    </div>`;

  wrap.querySelectorAll('[data-layer]').forEach(btn => {
    btn.onclick = () => { heatmapLayer = btn.dataset.layer; renderHeatmaps(switchTab); };
  });
  wrap.querySelectorAll('.hm-cell[data-day]').forEach(el => {
    el.onclick = () => {
      state.viewDay = +el.dataset.day;
      saveState();
      switchTab('today');
    };
  });
}

// Verticale mini-barreeks (sparkline). items: [{label, value, tone, ref}].
function sparkBars(items, maxVal) {
  const max = maxVal || Math.max(1, ...items.map(i => i.value || 0));
  return `<div class="ti-spark">${items.map(i => {
    const h = i.value ? Math.max(6, Math.round(i.value / max * 100)) : 0;
    return `<div class="ti-spark-col" title="${i.label}: ${i.value ? Math.round(i.value) : '—'}">
      <div class="ti-spark-bar ${i.tone || ''}" style="height:${h}%"></div>
      <span class="ti-spark-lbl">${i.label}</span>
    </div>`;
  }).join('')}</div>`;
}

function renderTrainingIntel() {
  const wrap = document.getElementById('trainingIntel');
  if (!wrap) return;

  const today = todayNum();
  const week = weekOf(today);
  const vol = weeklyVolume(week);

  // Krachtsessies t/m vandaag met gelogde knie-data: meest recente + historie.
  const kneeHist = [];
  for (let d = today; d >= 1 && kneeHist.length < 8; d--) {
    const code = sessionFor(dateForDay(d));
    if (!code.startsWith('K')) continue;
    const k = kneeLoadForSession(resolveSlots(SESSIONS[code], d), d);
    if (k.contributors.length) kneeHist.push({ day: d, ...k });
  }
  const knee = kneeHist[0] || null;

  const prsWeek = weekPRSummary(week);
  const prs = prTimeline(today, 8);

  if (!vol.total && !knee && !prs.length) {
    wrap.innerHTML = `
      <div class="ti-head"><h3>Trainingsintelligentie</h3></div>
      <div class="ti-empty">Log je sets op de Vandaag-tab — daarna verschijnen hier weekvolume, PR's en kniebelasting.</div>`;
    return;
  }

  const maxGroup = vol.groups.length ? vol.groups[0][1] : 1;
  const volBars = vol.groups.map(([g, v]) => `
    <div class="ti-bar-row">
      <span class="ti-bar-lbl">${g}</span>
      <span class="ti-bar-track"><span class="ti-bar-fill" style="width:${Math.max(4, Math.round(v / maxGroup * 100))}%"></span></span>
      <span class="ti-bar-val">${fmtVol(v)}</span>
    </div>`).join('');

  // Volume-trend over de weken t/m nu (#157).
  const series = weeklyVolumeSeries(week);
  const trendItems = series.map(s => ({ label: 'W' + s.week, value: s.total, tone: s.week === week ? 'cur' : '' }));
  const volTrend = series.length > 1 ? `<div class="ti-trend"><div class="ti-trend-lbl">Volume per week</div>${sparkBars(trendItems)}</div>` : '';

  const volCard = `
    <div class="ti-card">
      <div class="ti-card-top">
        <div><div class="ti-k">Weekvolume</div><div class="ti-v">${fmtVol(vol.total)}<small> kg·reps</small></div></div>
        ${deltaChip(vol.delta)}
      </div>
      <div class="ti-sub">${vol.sessionDays} ${vol.sessionDays === 1 ? 'sessie' : 'sessies'} gelogd in week ${week}</div>
      ${volBars ? `<div class="ti-bars">${volBars}</div>` : ''}
      ${volTrend}
    </div>`;

  // Kniebelasting: laatste sessie + historie-stippen (#11 / #170).
  let kneeCard = '';
  if (knee) {
    const band = KNEE_BAND[knee.band];
    const list = knee.contributors.slice(0, 3)
      .map(c => `${c.name}${c.unsafe ? ' ⚠︎' : ''} <b>${fmtVol(c.volume)}</b>`).join(' · ');
    const dots = kneeHist.slice().reverse()
      .map(h => `<span class="ti-dot ${KNEE_BAND[h.band].tone}" title="Dag ${h.day}: ${KNEE_BAND[h.band].label} (index ${h.index})"></span>`).join('');
    const highCount = kneeHist.filter(h => h.band === 'high').length;
    kneeCard = `
      <div class="ti-card">
        <div class="ti-card-top">
          <div><div class="ti-k">Kniebelasting · dag ${knee.day}</div><div class="ti-v">${band.label}<small> (index ${knee.index})</small></div></div>
          <span class="ti-band ${band.tone}">${band.label}</span>
        </div>
        <div class="ti-sub">${band.text}</div>
        <div class="ti-sub ti-muted">${list}</div>
        ${kneeHist.length > 1 ? `<div class="ti-dots"><span class="ti-dots-lbl">Laatste ${kneeHist.length} sessies</span><span class="ti-dots-row">${dots}</span>${highCount ? `<span class="ti-dots-note">${highCount}× hoog</span>` : ''}</div>` : ''}
      </div>`;
  }

  // PR-tijdlijn over het hele programma, met telling deze week (#158).
  let prCard = '';
  if (prs.length) {
    const rows = prs.map(p => `
      <div class="ti-pr-row">
        <span class="ti-pr-name">${p.name}</span>
        <span class="ti-pr-tags">${p.kinds.map(k => `<span class="ti-tag">${PR_LABELS[k]}</span>`).join('')}</span>
        <span class="ti-pr-day">${shortDate(p.day)}</span>
      </div>`).join('');
    prCard = `
      <div class="ti-card">
        <div class="ti-k">PR-tijdlijn ${prsWeek.length ? `<span class="ti-count">${prsWeek.length} deze week</span>` : ''}</div>
        <div class="ti-pr-list">${rows}</div>
      </div>`;
  }

  wrap.innerHTML = `
    <div class="ti-head"><h3>Trainingsintelligentie</h3><span>week ${week}</span></div>
    ${volCard}${kneeCard}${prCard}`;
}

// ---- Voortgang & tempo (#169 goal-pace, #159 macro-trend) -------------------

function renderProgressIntel() {
  const wrap = document.getElementById('progressIntel');
  if (!wrap) return;

  const today = todayNum();
  const week = weekOf(today);
  const pace = goalPace(today);
  const macro = macroWeeklySeries(week);
  const loggedWeeks = macro.filter(m => m.days > 0);
  const cvw = calorieVsWeight(today);
  const context = nutritionContextSplit(today);
  const contextDays = context.weekend.days + context.weekday.days;

  if (!pace.expected && !loggedWeeks.length && cvw.empty && !contextDays) { wrap.innerHTML = ''; return; }

  // Goal-pace card.
  const pacePct = pace.trainingPct === null ? null : Math.round(pace.trainingPct * 100);
  const paceTone = pacePct === null ? 'neutral' : pacePct >= 85 ? 'good' : pacePct >= 60 ? 'warn' : 'bad';
  let projLine = 'Log meer gewicht voor een dag-90 projectie.';
  if (pace.projected !== null) {
    const ch = pace.projectedChange;
    const conf = pace.weighIns >= 7 ? '' : ' <span class="ti-muted">(weinig metingen — indicatief)</span>';
    projLine = `Projectie dag 90: <b>${pace.projected.toFixed(1)} kg</b> (${ch >= 0 ? '+' : ''}${ch.toFixed(1)} kg vanaf start)${conf}`;
  }
  const paceCard = `
    <div class="ti-card">
      <div class="ti-card-top">
        <div><div class="ti-k">Trainings-tempo · dag ${today}/90</div><div class="ti-v">${pacePct === null ? '—' : pacePct + '%'}</div></div>
        <span class="ti-band ${paceTone === 'bad' ? 'bad' : paceTone === 'warn' ? 'warn' : 'good'}">${pace.done}/${pace.expected}</span>
      </div>
      <div class="ti-sub">${pace.done} van ${pace.expected} verwachte sessies voltooid.</div>
      <div class="ti-sub">${projLine}</div>
    </div>`;

  // Macro-trend: gem. kcal per week met doellijn (#159).
  let macroCard = '';
  if (loggedWeeks.length) {
    const goal = state.goals?.kcal || 0;
    const maxKcal = Math.max(goal, ...loggedWeeks.map(m => m.avgKcal || 0));
    const items = macro.map(m => ({
      label: 'W' + m.week,
      value: m.avgKcal,
      tone: m.avgKcal === null ? '' : goal && m.avgKcal > goal * 1.06 ? 'over' : m.week === week ? 'cur' : ''
    }));
    const lastP = loggedWeeks[loggedWeeks.length - 1].avgP;
    macroCard = `
      <div class="ti-card">
        <div class="ti-card-top">
          <div><div class="ti-k">Gem. kcal per week</div><div class="ti-v">${Math.round(loggedWeeks[loggedWeeks.length - 1].avgKcal)}<small> kcal</small></div></div>
          ${goal ? `<span class="ti-delta flat">doel ${goal}</span>` : ''}
        </div>
        ${sparkBars(items, maxKcal)}
        <div class="ti-sub ti-muted">Laatste week: eiwit ~${lastP ? Math.round(lastP) : '—'} g/dag gem.</div>
      </div>`;
  }

  let contextCard = '';
  if (contextDays < 2) {
    contextCard = `
      <div class="ti-card">
        <div class="ti-k">Voedingscontext</div>
        <div class="ti-sub">Log meer dagen voor weekend- en trainingsdag-analyse.</div>
      </div>`;
  } else {
    contextCard = `
      <div class="ti-card">
        <div class="ti-card-top">
          <div><div class="ti-k">Voedingscontext</div><div class="ti-v">${contextDays}<small> dagen</small></div></div>
          <span class="ti-delta flat">read-only</span>
        </div>
        <div class="ti-context-list">
          ${contextRow('Weekend', context.weekend, 'doordeweeks', context.weekday, contextDelta(context.weekend, context.weekday, 'in weekend', 'doordeweeks'))}
          ${contextRow('Trainingsdag', context.trainingDay, 'rustdag', context.restDay, contextDelta(context.trainingDay, context.restDay, 'op trainingsdagen', 'op rustdagen'))}
        </div>
      </div>`;
  }

  // Calorie-trend vs gewichtstrend (#15 / roadmap-doel 45): regelgebaseerde,
  // niet-causale duiding op één regel, met confidence-badge.
  let cvwCard = '';
  if (cvw.empty) {
    cvwCard = `
      <div class="ti-card">
        <div class="ti-k">Calorieën vs gewichtstrend</div>
        <div class="ti-sub">Log voeding én gewicht voor deze vergelijking.</div>
      </div>`;
  } else {
    const trendStr = cvw.ewmaTrendPerWeek === null
      ? '—'
      : `${cvw.ewmaTrendPerWeek >= 0 ? '+' : ''}${cvw.ewmaTrendPerWeek.toFixed(1).replace('.', ',')}`;
    cvwCard = `
      <div class="ti-card">
        <div class="ti-card-top">
          <div><div class="ti-k">Calorieën vs gewichtstrend ${confBadge(cvw.conf)}</div><div class="ti-v">${cvw.avgKcalRecent}<small> kcal/d</small></div></div>
          <span class="ti-delta flat">${trendStr} kg/wk</span>
        </div>
        <div class="ti-sub">${cvw.verdict}</div>
        <div class="ti-sub ti-muted">${cvw.loggedDays} gelogde dagen · ${cvw.weighIns} weegmomenten (14d).</div>
      </div>`;
  }

  wrap.innerHTML = `
    <div class="ti-head"><h3>Voortgang &amp; tempo</h3><span>dag ${today}</span></div>
    ${paceCard}${macroCard}${contextCard}${cvwCard}`;
}
