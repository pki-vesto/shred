# Claude Code Guidelines

## Basisregel

Werk als een conservatieve maintainer. Lees de bestaande code, behoud de stack en wijzig alleen wat nodig is.

## Geen Dependency Creep

Niet toevoegen zonder expliciete reden:

- frontend frameworks;
- state management libraries;
- ORMs;
- cloud SDK's;
- analytics trackers;
- UI component libraries;
- build tools voor simpele frontendwijzigingen.

Een dependency is alleen acceptabel als de bestaande stack het probleem niet redelijk oplost en Peter akkoord is.

## Geen Frameworks

De frontend blijft vanilla HTML/CSS/JS. Geen React/Vite/Next/Svelte migratie. De eenvoud is een productkeuze: PWA, self-hosted, debuggable, weinig bewegende delen.

## Geen Breaking Changes

Breek niet:

- exercise IDs;
- sync type/key vormen;
- product IDs;
- photo metadata;
- service worker asset paths;
- Health Core metric keys;
- bestaande IndexedDB state.

Wanneer een breaking change onvermijdelijk lijkt, ontwerp eerst een migratie en rollback.

## Service Worker Regels

- Bump `CACHE_VERSION` bij app shell wijzigingen.
- Cache geen API-state behalve photo blobs.
- Laat navigatie fallback naar `index.html` werken.
- Geef subresource misses geen HTML fallback.
- Test dat nieuwe JS/CSS paden in `SHELL_ASSETS` staan.

## Cache Versiebeheer

`CACHE_VERSION` is deploy control. Een vergeten bump kan ervoor zorgen dat iPhone PWA oude code blijft gebruiken met nieuwe servercontracts.

Bij wijzigingen aan:

- `index.html`
- `css/app.css`
- `js/**`
- `manifest.json`
- icons

moet de versie omhoog.

## Sync Validatie

Nieuwe sync-recordtypes vereisen:

- client `mutate(type,key)`;
- client `readValue`;
- client `writeValue`;
- server table;
- server `TYPES` handler;
- indexes op `updated_at`;
- migratie/backward compatibility;
- docs update;
- test of handmatige syncverificatie.

## Health Core Regels

- Dual-write is non-fatal.
- Geen read-cutover zonder fallback.
- Formula changes versioneren.
- Core ingest/read failures mogen Shred logging niet blokkeren.
- Metric keys additive behandelen.

## Testvereisten

Minimaal passend bij wijziging:

- backend route smoke via curl/node script;
- sync POST/GET contract check;
- IndexedDB workflow handmatig in browser;
- service worker update check;
- Health Core dual-write check wanneer relevant;
- mobile viewport check voor UI-wijzigingen.

Als tests niet gedraaid zijn, vermeld dat expliciet.

Bestaande checks (draaibaar):

- `npm test` — frontend metrics smoke-suite voor `js/*Metrics.js` via `node --test`.
- `api/test-core.mjs` — Health Core dual-write op wegwerp-DB's (`node api/test-core.mjs`, of via de container). Raakt nooit echte data.
- `api/test-sync.mjs` — sync-contract round-trip (POST/GET/LWW/since) tegen de echte router op een wegwerp-DB.
- `api/check-auth-boundary.sh` — borgt dat API/Whisper geen host-poort hebben (`bash api/check-auth-boundary.sh`).
- Frontend-logica buiten `js/*Metrics.js`: kopieer de pure module naar een temp-`.mjs` met mock-imports en draai `node --check` + een kleine assert-harness.

## Docs-Onderhoud

De `docs/`-map is de bron van waarheid (zie [README.md](README.md)). Bij elke wijziging die gedrag, schema, architectuur, endpoints of roadmapstatus raakt:

- werk het relevante engine-/architectuurdocument bij in dezelfde wijziging (niet "later");
- houd "Huidige Status" in [03_PROJECT_HANDBOOK.md](03_PROJECT_HANDBOOK.md) actueel;
- voeg een echte entry toe aan [20_RELEASE_NOTES.md](20_RELEASE_NOTES.md) (geen fictieve releases);
- noem expliciet wat wél en niet geverifieerd is.

Docs en code horen in één commit/wijziging samen; een PR die gedrag verandert zonder docupdate is incompleet.

## Security

Huidig authmodel:

- geen app-level auth;
- Tailscale is de boundary;
- iedereen in tailnet kan data lezen/schrijven.

Nooit publiek exposen. Geen Tailscale Funnel of port-forward zonder app-auth ontwerp.

## AI Development

- Gebruik structured outputs.
- Sanity-check LLM-output.
- Toon preview bij datawrites.
- Log geen secrets.
- Stuur audio niet extern.
- Beperk prompts tot noodzakelijke context.
