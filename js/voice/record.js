// Microfoon-opname via MediaRecorder. Vereist een secure context (https) —
// over plain http is navigator.mediaDevices undefined (vooral iOS Safari).

export function isRecordingSupported() {
  return !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

// Reden waarom opnemen niet kan, of '' als het wél kan. Voor nette UI-meldingen.
export function unsupportedReason() {
  if (!window.isSecureContext) return 'Microfoon vereist HTTPS. Open de app via https://shred.tail9d0c71.ts.net.';
  if (!navigator.mediaDevices?.getUserMedia) return 'Deze browser geeft geen microfoontoegang.';
  if (!window.MediaRecorder) return 'Deze browser ondersteunt geen audio-opname.';
  return '';
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  // iOS Safari levert audio/mp4; Chrome/Firefox audio/webm.
  for (const c of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

// Start een opname. Retourneert een controller:
//   stop()   -> Promise<{ blob, mime, durationMs }>
//   cancel() -> Promise<null>  (gooit de opname weg)
// onTick(ms) wordt elke ~200ms aangeroepen met de verstreken tijd.
// onAutoStop() vuurt als de maximale duur bereikt is (de opname stopt dan zelf).
export async function startRecording({ maxMs = 60_000, onTick, onAutoStop } = {}) {
  const reason = unsupportedReason();
  if (reason) { const e = new Error(reason); e.code = 'unsupported'; throw e; }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    const e = new Error('Geen toegang tot de microfoon. Sta het toe in je browserinstellingen.');
    e.code = 'permission';
    throw e;
  }

  const mime = pickMime();
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const startedAt = Date.now();
  let cancelled = false;
  let resolveStop;
  const stopped = new Promise((r) => { resolveStop = r; });

  const tick = setInterval(() => onTick?.(Date.now() - startedAt), 200);
  const maxTimer = setTimeout(() => { onAutoStop?.(); if (rec.state !== 'inactive') rec.stop(); }, maxMs);

  rec.onstop = () => {
    clearInterval(tick);
    clearTimeout(maxTimer);
    stream.getTracks().forEach((t) => t.stop());
    if (cancelled) return resolveStop(null);
    const blob = new Blob(chunks, { type: mime || chunks[0]?.type || 'audio/webm' });
    resolveStop({ blob, mime: blob.type || mime || 'audio/webm', durationMs: Date.now() - startedAt });
  };

  rec.start();

  return {
    stop() { if (rec.state !== 'inactive') rec.stop(); return stopped; },
    cancel() { cancelled = true; if (rec.state !== 'inactive') rec.stop(); return stopped; }
  };
}

// Vraag eenmalig toegang en sluit meteen weer — voor de "Mic test"-knop.
export async function testMic() {
  const reason = unsupportedReason();
  if (reason) { const e = new Error(reason); e.code = 'unsupported'; throw e; }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
  return true;
}
