// Client-kant van /api/products/lookup: stuurt een productnaam naar de backend
// en krijgt geschatte macro's per 100 g terug (Claude Haiku, sanity-gecheckt).
// Auth loopt via Tailscale, net als de rest van de API.
//
// Gooit een Error met .status (0 bij netwerkfout, anders de HTTP-status) zodat
// de UI netjes kan terugvallen op handmatig invoeren.

export async function lookupMacros(name) {
  let r;
  try {
    r = await fetch('/api/products/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
  } catch {
    const err = new Error('Geen verbinding voor auto-lookup, voer handmatig in.');
    err.status = 0;
    throw err;
  }

  if (!r.ok) {
    let msg = 'Kon macro\'s niet bepalen, voer handmatig in.';
    try { const j = await r.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return r.json();
}
