import { state, loadState, saveState } from './state.js';
import { hydratePhotoURLs } from './photos.js';
import { TOTAL_DAYS, todayNum } from './helpers.js';
import { renderTopbar, onSwipe } from './ui/components.js';
import { renderToday, renderDeloadSuggestion } from './ui/today.js';
import { renderFood } from './ui/food.js';
import { initNutrition } from './nutrition.js';
import { toast } from './ui/components.js';
import { renderBody } from './ui/body.js';
import { renderOverview } from './ui/overview.js';
import { renderSettings } from './ui/settings.js';
import { init as syncInit, onStatus as onSyncStatus, syncNow } from './sync.js';
import { initTheme } from './theme.js';

const TABS = ['today', 'food', 'body', 'overview', 'settings'];

function switchTab(name) {
  document.querySelectorAll('.bnav').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  TABS.forEach(t => document.getElementById('tab-' + t).classList.toggle('hidden', t !== name));

  const el = document.getElementById('tab-' + name);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.classList.remove('entering');
    void el.offsetWidth;
    el.classList.add('entering');
    setTimeout(() => el.classList.remove('entering'), 380);
  }

  if (name === 'today')    { renderToday(); renderDeloadSuggestion(); }
  if (name === 'food')     renderFood();
  if (name === 'body')     renderBody();
  if (name === 'overview') renderOverview(switchTab);
  if (name === 'settings') renderSettings();
  window.scrollTo(0, 0);
}

initTheme();
await loadState();
await hydratePhotoURLs();
const { migrated } = initNutrition();
state.viewDay = todayNum();
state.foodViewDay = todayNum();

if (migrated) {
  // Eénmalige melding na migratie van het oude meal-module systeem.
  setTimeout(() => toast('Voeding-systeem geüpdatet. Oude logs zijn bewaard.', 'success'), 800);
}

document.querySelectorAll('.bnav').forEach(b => b.onclick = () => switchTab(b.dataset.tab));

document.getElementById('prevDay').onclick = () => {
  if (state.viewDay > 1) { state.viewDay--; saveState(); renderToday(); renderDeloadSuggestion(); }
};
document.getElementById('nextDay').onclick = () => {
  if (state.viewDay < TOTAL_DAYS) { state.viewDay++; saveState(); renderToday(); renderDeloadSuggestion(); }
};
document.getElementById('todayBtn').onclick = () => {
  state.viewDay = todayNum(); saveState(); renderToday(); renderDeloadSuggestion();
};
document.getElementById('foodPrev').onclick = () => {
  if (state.foodViewDay > 1) { state.foodViewDay--; saveState(); renderFood(); }
};
document.getElementById('foodNext').onclick = () => {
  if (state.foodViewDay < TOTAL_DAYS) { state.foodViewDay++; saveState(); renderFood(); }
};
document.getElementById('photoClose').onclick = () => document.getElementById('photoViewer').classList.remove('open');
document.getElementById('photoViewer').onclick = (e) => {
  if (e.target.id === 'photoViewer') document.getElementById('photoViewer').classList.remove('open');
};

renderToday();
renderDeloadSuggestion();
renderTopbar();

// Sync status dot in topbar. Map our richer engine states to the 4 design
// states the CSS knows: idle, syncing, ok, error.
const dot = document.getElementById('syncDot');
const STATUS_CLASS = { idle: 'idle', syncing: 'syncing', ok: 'ok', fail: 'error', offline: 'error' };
onSyncStatus(({ state: s, lastSyncTs }) => {
  dot.className = `sync-dot ${STATUS_CLASS[s] || 'idle'}`;
  const when = lastSyncTs ? new Date(lastSyncTs).toLocaleTimeString('nl-NL') : 'nooit';
  dot.title = `Sync: ${s} — laatste: ${when}`;
});
dot.onclick = () => syncNow();

// Re-render visible tab when server-side changes are applied.
document.addEventListener('shred:state-applied', () => {
  renderToday();
  renderDeloadSuggestion();
  renderTopbar();
  if (!document.getElementById('tab-food').classList.contains('hidden')) renderFood();
  if (!document.getElementById('tab-overview').classList.contains('hidden')) renderOverview(switchTab);
  if (!document.getElementById('tab-body').classList.contains('hidden')) renderBody();
});

// Spraak: na een accept (food-changed) of na het verwerken van de offline
// wachtrij (voice-pending) de voeding-tab verversen als die zichtbaar is.
const refreshFoodIfVisible = () => {
  if (!document.getElementById('tab-food').classList.contains('hidden')) renderFood();
  if (!document.getElementById('tab-overview').classList.contains('hidden')) renderOverview(switchTab);
};
document.addEventListener('shred:food-changed', refreshFoodIfVisible);
document.addEventListener('shred:voice-pending', refreshFoodIfVisible);

await syncInit();

// Swipe gestures on the day cards.
onSwipe(document.getElementById('sessionContainer'), {
  left:  () => { if (state.viewDay < TOTAL_DAYS) { state.viewDay++; saveState(); renderToday(); renderDeloadSuggestion(); } },
  right: () => { if (state.viewDay > 1)          { state.viewDay--; saveState(); renderToday(); renderDeloadSuggestion(); } }
});
onSwipe(document.getElementById('tab-food'), {
  left:  () => { if (state.foodViewDay < TOTAL_DAYS) { state.foodViewDay++; saveState(); renderFood(); } },
  right: () => { if (state.foodViewDay > 1)          { state.foodViewDay--; saveState(); renderFood(); } }
});

// Service worker — last, never blocks first paint.
if ('serviceWorker' in navigator) {
  let reloadingForSw = false;
  let updatePromptShown = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForSw) return;
    reloadingForSw = true;
    window.location.reload();
  });

  function showUpdatePrompt(reg) {
    if (!navigator.serviceWorker.controller) return;
    if (updatePromptShown) return;
    updatePromptShown = true;
    toast('Nieuwe versie beschikbaar — tik om te herladen', 'success', {
      timeout: 0,
      onClick: () => reg.waiting?.postMessage('skip-waiting')
    });
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      if (reg.waiting) showUpdatePrompt(reg);
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdatePrompt(reg);
        });
      });
      reg.update().catch(() => {});
    }).catch(err => console.warn('SW registration failed', err));
  });
}
