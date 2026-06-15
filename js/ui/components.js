// Shared UI primitives: topbar + toast + progress ring + check pop + celebrate
// + haptics + horizontal swipe detector.

import { state } from '../state.js';
import { TOTAL_DAYS, todayNum, dayIsComplete } from '../helpers.js';

export const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';

// ---- Topbar ----
export function renderTopbar() {
  let done = 0;
  for (let i = 1; i <= TOTAL_DAYS; i++) if (dayIsComplete(i)) done++;
  const pct = Math.round((done / TOTAL_DAYS) * 100);
  document.getElementById('pDay').textContent = todayNum();
  document.getElementById('pPct').textContent = pct + '%';
  document.getElementById('pBar').style.width = pct + '%';
}

// ---- Toast (with optional success icon) ----
export function toast(msg, type, opts = {}) {
  const host = document.getElementById('toastHost');
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '') + (opts.onClick ? ' action' : '');
  el.innerHTML = (type === 'success' ? `<span class="ic">${CHECK_SVG}</span>` : '')
               + `<span>${escapeHtml(msg)}</span>`;
  if (opts.onClick) {
    el.tabIndex = 0;
    el.role = 'button';
    el.onclick = opts.onClick;
    el.onkeydown = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      opts.onClick();
    };
  }
  host.appendChild(el);
  if (opts.timeout === 0) return;
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, opts.timeout || 2000);
}

// ---- Progress ring (small svg in session-card header) ----
export function progressRing(done, total) {
  const r = 15, c = 2 * Math.PI * r, pct = total ? done / total : 0;
  const col = done === total && total > 0 ? 'var(--green)' : 'var(--amber)';
  return `<svg width="40" height="40" viewBox="0 0 40 40">
    <circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="3.5"/>
    <circle cx="20" cy="20" r="${r}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${(c * (1 - pct)).toFixed(2)}" transform="rotate(-90 20 20)"
      style="transition:stroke-dashoffset .5s var(--ease)"/>
    <text x="20" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="var(--text)">${done}/${total}</text>
  </svg>`;
}

// ---- Check pop animation via WAAPI ----
export function popCheck(el) {
  if (!el?.animate) return;
  el.animate(
    [{ transform: 'scale(.5)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
    { duration: 340, easing: 'cubic-bezier(.2,.9,.25,1.3)' }
  );
  const ring = el.querySelector('.check-ring');
  if (ring) ring.animate(
    [{ opacity: .9, transform: 'scale(.7)' }, { opacity: 0, transform: 'scale(1.6)' }],
    { duration: 480, easing: 'ease-out' }
  );
}

// ---- Day-complete celebrate flourish on the session-card ----
export function celebrate() {
  const card = document.querySelector('.session-card');
  if (!card) return;
  card.classList.remove('celebrate');
  void card.offsetWidth;
  card.classList.add('celebrate');
}

// ---- Confidence badge (gedeeld; #164) ----
// Toont alleen bij twijfel: 'low'/'medium' krijgen een chip, 'high' blijft stil
// zodat de UI rustig is en aandacht naar onzekere cijfers gaat.
const CONF_BADGE = { low: ['bad', 'lage zekerheid'], medium: ['warn', 'indicatief'] };
export function confBadge(level) {
  const c = CONF_BADGE[level];
  if (!c) return '';
  return `<span class="conf-badge ${c[0]}" title="Zekerheid: ${c[1]}">${c[1]}</span>`;
}

// ---- Haptic ----
export function tick(ms = 10) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// ---- Horizontal swipe detector ----
export function onSwipe(el, { left, right, threshold = 40 } = {}) {
  let sx = 0, sy = 0, active = false;
  function down(e) {
    const p = e.touches ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY; active = true;
  }
  function up(e) {
    if (!active) return;
    active = false;
    const p = e.changedTouches ? e.changedTouches[0] : e;
    const dx = p.clientX - sx, dy = p.clientY - sy;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < threshold) return;
    if (dx < 0) left?.(); else right?.();
  }
  el.addEventListener('touchstart', down, { passive: true });
  el.addEventListener('touchend', up, { passive: true });
  return () => {
    el.removeEventListener('touchstart', down);
    el.removeEventListener('touchend', up);
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
