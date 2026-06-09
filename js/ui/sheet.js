// Gedeelde bottom-sheet infrastructuur. Eén singleton-sheet die door zowel de
// voeding-UI (js/ui/food.js) als de spraak-UI (js/ui/voice.js) gebruikt wordt.
// Vul de inhoud via sheetBody().innerHTML = ... na openSheet().

let sheetEl = null;

export function ensureSheet() {
  if (sheetEl) return sheetEl;
  sheetEl = document.createElement('div');
  sheetEl.className = 'sheet-backdrop';
  sheetEl.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-inner"></div></div>`;
  document.body.appendChild(sheetEl);
  sheetEl.addEventListener('click', (e) => { if (e.target === sheetEl) closeSheet(); });
  enableSwipeClose(sheetEl.querySelector('.sheet'));
  return sheetEl;
}

// Swipe-down om de sheet te sluiten. Begint alleen bovenaan de sheet (grip /
// kop), zodat het scrollen in een lange lijst niet wordt onderbroken.
function enableSwipeClose(sheet) {
  let startY = 0, dy = 0, armed = false;
  sheet.addEventListener('touchstart', (e) => {
    const t = e.target;
    const onGrip = t.closest('.sheet-grip, .sheet-head');
    const list = sheet.querySelector('.sheet-list');
    const atTop = !list || list.scrollTop <= 0;
    armed = !!onGrip || atTop;
    startY = e.touches[0].clientY;
    dy = 0;
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (!armed) return;
    dy = e.touches[0].clientY - startY;
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (!armed) return;
    sheet.style.transform = '';
    if (dy > 80) closeSheet();
    armed = false; dy = 0;
  }, { passive: true });
}

export function openSheet() {
  ensureSheet();
  sheetEl.classList.add('open');
  document.body.classList.add('sheet-lock');
}

export function closeSheet() {
  if (!sheetEl) return;
  sheetEl.classList.remove('open');
  document.body.classList.remove('sheet-lock');
}

export function sheetBody() {
  ensureSheet();
  return sheetEl.querySelector('.sheet-inner');
}
