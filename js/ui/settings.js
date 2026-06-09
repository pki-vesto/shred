import { state, saveState, mutate, wipeAll } from '../state.js';
import { getStartDate, todayNum } from '../helpers.js';
import { renderTopbar, toast } from './components.js';
import { renderToday } from './today.js';
import { onStatus, syncNow } from '../sync.js';
import { openLibraryManager, openTemplatesManager } from './food.js';
import { isVoiceEnabled, setVoiceEnabled, testMic } from './voice.js';
import { isRecordingSupported, unsupportedReason } from '../voice/record.js';
import { installSeed } from '../nutrition.js';
import { getThemePref, setThemePref } from '../theme.js';

const ICON_DATA_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cg fill='%23303338'%3E%3Ccircle cx='18' cy='18' r='3'/%3E%3Ccircle cx='32' cy='18' r='3'/%3E%3Ccircle cx='46' cy='18' r='3'/%3E%3Ccircle cx='18' cy='32' r='3'/%3E%3Ccircle cx='46' cy='46' r='3'/%3E%3C/g%3E%3Cg fill='%23f2a73c'%3E%3Ccircle cx='46' cy='32' r='3'/%3E%3Ccircle cx='32' cy='32' r='3'/%3E%3Ccircle cx='32' cy='46' r='3'/%3E%3Ccircle cx='18' cy='46' r='3'/%3E%3C/g%3E%3C/svg%3E";

const SYNC_ICON = '<svg viewBox="0 0 24 24" stroke-width="1.8" fill="none" stroke="currentColor"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/></svg>';

export function renderSettings() {
  // Weergave — thema (per-device, niet gesynct)
  const themeSeg = document.getElementById('themeSeg');
  if (themeSeg) {
    const cur = getThemePref();
    themeSeg.querySelectorAll('[data-theme-opt]').forEach(b => {
      b.classList.toggle('active', b.dataset.themeOpt === cur);
      b.onclick = () => {
        setThemePref(b.dataset.themeOpt);
        themeSeg.querySelectorAll('[data-theme-opt]').forEach(x => x.classList.toggle('active', x === b));
      };
    });
  }

  // Startdatum
  const s = getStartDate();
  const iso = s.getFullYear() + '-' + String(s.getMonth() + 1).padStart(2, '0') + '-' + String(s.getDate()).padStart(2, '0');
  document.getElementById('startDateInput').value = iso;
  document.getElementById('todayDayNum').textContent = todayNum();
  document.getElementById('saveStart').onclick = () => {
    const v = document.getElementById('startDateInput').value;
    if (!v) return;
    state.startDate = v;
    mutate('meta', 'startDate');
    renderSettings();
    renderToday();
    renderTopbar();
    toast('Startdatum opgeslagen · dag ' + todayNum(), 'success');
  };

  // Macros — let op: de input-ids zijn goalKcal/goalP/goalC/goalF (capitalize
  // first letter), NIET goalKCAL. k.toUpperCase() klopte alleen voor p/c/f en
  // liet renderSettings crashen op 'kcal', waardoor alle wiring hieronder
  // (sync, voeding, spraak, export, reset) dood bleef.
  ['kcal', 'p', 'c', 'f'].forEach(k => {
    document.getElementById('goal' + k[0].toUpperCase() + k.slice(1)).value = state.goals[k];
  });
  document.getElementById('goalMaxHr').value = state.goals.maxHr || '';
  document.getElementById('saveGoals').onclick = () => {
    state.goals.kcal = +document.getElementById('goalKcal').value || 2250;
    state.goals.p    = +document.getElementById('goalP').value || 180;
    state.goals.c    = +document.getElementById('goalC').value || 220;
    state.goals.f    = +document.getElementById('goalF').value || 65;
    const mh = parseInt(document.getElementById('goalMaxHr').value);
    if (Number.isFinite(mh) && mh > 0) state.goals.maxHr = mh; else delete state.goals.maxHr;
    mutate('meta', 'goals');
    toast('Doelen opgeslagen', 'success');
  };

  // Sync — wraps the real sync.js engine in the design's card layout. No token:
  // access is gated by Tailscale at the network layer.
  const sec = document.getElementById('syncSection');
  if (sec) {
    sec.innerHTML = `<h2 class="section-title">Sync</h2>
      <div class="set-card">
        <div class="set-hint">Sync loopt automatisch over je tailnet — geen token nodig. Zorg dat Tailscale aan staat op dit apparaat zodat iPhone en Mac dezelfde data zien.<br>Status: <b id="syncStatusInline">—</b></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button id="syncNowBtn" class="btn-ghost" style="flex:1;">${SYNC_ICON}Sync nu</button>
      </div>`;
    document.getElementById('syncNowBtn').onclick = () => syncNow();
    onStatus((s) => {
      const line = document.getElementById('syncStatusInline');
      if (!line) return;
      const when = s.lastSyncTs ? new Date(s.lastSyncTs).toLocaleString('nl-NL') : '—';
      line.textContent = `${s.state} · laatste ${when}`;
    });
  }

  // Voeding — bibliotheek + templates beheren
  document.getElementById('manageLibBtn').onclick = () => openLibraryManager();
  document.getElementById('manageTplBtn').onclick = () => openTemplatesManager();
  document.getElementById('resetLibBtn').onclick = () => {
    if (!confirm('Startbibliotheek herstellen? Seed-producten worden teruggezet en weer zichtbaar gemaakt. Eigen producten blijven ongemoeid.')) return;
    installSeed(true);
    toast('Bibliotheek hersteld', 'success');
  };

  // Spraak — inschakelen + mic test
  const voiceToggle = document.getElementById('voiceEnabled');
  if (voiceToggle) {
    voiceToggle.checked = isVoiceEnabled();
    voiceToggle.onchange = () => {
      setVoiceEnabled(voiceToggle.checked);
      toast(voiceToggle.checked ? 'Spraak aan' : 'Spraak uit', 'success');
    };
    const info = document.getElementById('voiceInfo');
    const reason = isRecordingSupported() ? '' : unsupportedReason();
    info.innerHTML = reason
      ? `⚠ ${escapeAttr(reason)}`
      : 'Audio wordt op je eigen server (frodo) getranscribeerd en geparset — niet bewaard na verwerking.';
    document.getElementById('micTestBtn').onclick = async () => {
      try { await testMic(); toast('Microfoon werkt', 'success'); }
      catch (e) { toast(e?.message || 'Mic test mislukt', 'error'); }
    };
  }

  // Icon preview tile
  document.getElementById('iconTile').style.background = `#15181b url("${ICON_DATA_URL}") center/cover`;

  // Data — export + reset
  document.getElementById('exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shred-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export gestart', 'success');
  };
  document.getElementById('resetBtn').onclick = async () => {
    if (!confirm('ALLES wissen? Dit kan niet ongedaan worden.')) return;
    localStorage.removeItem('shred_state_v2');
    await wipeAll();
    location.reload();
  };
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}
