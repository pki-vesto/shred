// Thema-voorkeur (Systeem / Licht / Donker). BEWUST per-device en NIET gesynct:
// licht thuis 's ochtends en donker in de sportschool kan per toestel verschillen.
// Net als de spraak-toggle bewaard in localStorage. Het thema wordt toegepast
// door een token-set op <html data-theme> te zetten — geen component hoeft te
// weten welk thema actief is (zie de [data-theme="light"] block in css/app.css).
//
// De eerste toepassing gebeurt al vóór eerste paint via een klein inline-script
// in index.html (geen flits); dit module-niveau dekt het live wisselen + het
// meelopen met het systeemthema af.

const THEME_KEY = 'shred_theme';
const DEFAULT = 'light';   // Peter's voorkeur; te wijzigen via Settings ▸ Weergave

// 'system' | 'light' | 'dark'
export function getThemePref() {
  const v = localStorage.getItem(THEME_KEY);
  return v === 'system' || v === 'light' || v === 'dark' ? v : DEFAULT;
}

export function setThemePref(t) {
  localStorage.setItem(THEME_KEY, t);
  applyTheme();
}

// De effectief te tonen modus ('light' | 'dark'), met 'system' opgelost.
export function resolveTheme(t = getThemePref()) {
  if (t === 'system') return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  return t === 'light' ? 'light' : 'dark';
}

export function applyTheme() {
  const eff = resolveTheme();
  document.documentElement.setAttribute('data-theme', eff);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.setAttribute('content', eff === 'light' ? '#f1f2f4' : '#0b0c0e');
}

// Eénmalig: pas toe + volg het systeemthema live zolang de voorkeur 'system' is.
let listenerAttached = false;
export function initTheme() {
  applyTheme();
  if (listenerAttached) return;
  listenerAttached = true;
  try {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => { if (getThemePref() === 'system') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);   // oudere Safari
  } catch { /* matchMedia niet beschikbaar — geen systeem-koppeling */ }
}
