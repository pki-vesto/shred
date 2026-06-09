# Release Notes

Dit bestand definieert het formaat voor toekomstige releases. Vul geen fictieve releases in. Voeg alleen entries toe wanneer er werkelijk iets is gewijzigd en gedeployed of bewust als release is gemarkeerd.

## 2026-06-09 - v1.5.0

M3-a: lichaamsmetingen als nieuw sync-type (#80, #81, #82). Eerste datamodel-uitbreiding sinds de analytics-milestones — strikt additief.

### Added
- **Lichaamsmetingen** op de Lichaam-tab: taille/heup/borst/arm/dij (cm) per dag, met taille-trend (laatste waarde, delta sinds start, cm/week).
- Nieuw sync-recordtype **`measurements`** (key `<day>`, value `{waist,hip,chest,arm,thigh}`, LWW), volledig end-to-end: client `state.measurements` + `mutate`/read/write in `sync.js`, server tabel + `TYPES`-handler + index.
- Health Core dual-write naar `body.waist`/`body.hip`/`body.chest`/`body.arm`/`body.thigh` (cm, alleen ingevulde velden).
- `bodyMetrics.js`: `measurementSeries`, `measurementTrend`.
- `api/test-sync.mjs`: sync-contract integratietest (round-trip + LWW + since-filter) tegen de echte router op wegwerp-DB's (dekt backlog #187).

### Changed
- `api/test-core.mjs` uitgebreid met measurements-dual-write asserts.

### Data / Migrations
- Additief: nieuwe tabel `measurements` (`CREATE TABLE IF NOT EXISTS` + index) en nieuwe `state.measurements` met default `{}`. Geen wijziging aan bestaande tabellen/records; geen migratie van bestaande data nodig. Health Core: nieuwe `body.*` metric_types via idempotente `INSERT OR IGNORE`.

### Operations
- `CACHE_VERSION` `shred-v18` → `shred-v19`.
- `shred-api` image herbouwd + herstart (nieuwe tabel/sync-type/dual-write live).

### Verification
- `node --check` op alle gewijzigde frontend- + api-modules: OK.
- `api/test-core.mjs` in verse container: groen, incl. `body.waist`=88/`body.hip`=96/`body.arm`=35 op de juiste datum en `body.chest` afwezig (niet ingevuld).
- `api/test-sync.mjs` in verse container: groen (measurements POST→GET round-trip, LWW oudere afgewezen/nieuwere geaccepteerd, since-filter, onbekend type afgewezen).
- Nog niet handmatig in de browser/PWA geverifieerd (invoer + sync tussen devices).

### Known Issues
- Geen plausibiliteitsgrenzen per meetveld behalve 0 < waarde < 400 (fijnmazige checks = #95).
- Alleen taille heeft een trendweergave; overige velden worden wel gelogd en gesynct.

## 2026-06-09 - v1.4.0

De 12 resterende deeltaken (DEELS → klaar) afgemaakt.

### Added
- **Equipment-chip** per oefening (Vandaag + swap), afgeleid via `equipmentFor` in `exercises.js` (#14).
- **Volledig weekrapport** op het Overzicht: training, lichaam (EWMA), voeding, eiwit en herstel — elk met een **confidence-badge** — plus één concrete **aanbeveling** (#160, #49, #109).
- **Confidence-badges** systeembreed via gedeelde `confBadge()` in `components.js`, ook op de week-KPI's (#164, #151).
- `GET /api/health/core` — Health Core dual-write status + formuleversies, read-only, geen secrets (#127).
- Test/checks: `api/test-core.mjs` (dual-write op wegwerp-DB's) en `api/check-auth-boundary.sh` (poortgrens) (#190, #179).

### Changed
- **Productzoek** rankt nu op matchkwaliteit + gebruik i.p.v. puur alfabetisch (`food.js`, #28).
- **Voice-voorstel UX**: confidence-pills (alleen bij twijfel), per-100g check voor nieuwe producten, uitlegregel (`voice.js`, #33).
- Week-KPI gewichtstrend gebruikt nu EWMA i.p.v. ruwe regressie (consistent met de Lichaam-tab).
- Docs als bron van waarheid bijgewerkt: 03/04/06/07/11/19/14 + deze notes; docs-onderhoud als expliciete conventie vastgelegd in `19_CLAUDE_CODE_GUIDELINES.md` (#199).

### Data / Migrations
- Geen. Geen schema-, sync- of IndexedDB-wijziging. Frontend volledig additief; backend voegt alleen een read-only endpoint + offline test toe.

### Operations
- `CACHE_VERSION` `shred-v17` → `shred-v18` (frontend bind-mounted, geen rebuild).
- `shred-api` image herbouwd + herstart om `coreStatus()` / `/api/health/core` live te zetten (npm-layer uit cache; korte herstart).

### Verification
- `node --check` op alle gewijzigde frontend-modules: OK.
- `api/test-core.mjs` in verse container: **14/14 asserts groen** (body.weight, nutrition.*, session_volume, idempotent LWW, best-effort no-throw, formuleversies).
- `api/check-auth-boundary.sh`: groen (API + Whisper zonder host-poort).
- `GET /api/health/core` via Caddy: geeft `enabled:true` + `nutrition_day_v1`/`session_volume_day_v1`.
- Confidence/ranking/voice/equipment UI nog niet handmatig in de browser/PWA gecheckt.

### Known Issues
- Equipmenttype is heuristisch uit de naam afgeleid; enkele oefeningen tonen geen chip (geen match). Expliciet `ex.equipment` kan dat later verfijnen.
- Confidence-niveaus zijn op datavolume gebaseerd (aantal logs/metingen), nog niet op variantie.

## 2026-06-09 - v1.3.0

### Added
- Overzicht-analytics, read-only over bestaande data:
  - **Volume-trend per week** (sparkline) in de Trainingsintelligentie-sectie (#157);
  - **PR-tijdlijn** over het hele programma met telling deze week (#158);
  - **Kniebelasting-historie** (stippen laag/matig/hoog over laatste sessies + "N× hoog") als knie-risk dashboard (#170);
  - Nieuwe sectie **"Voortgang & tempo"**: goal-pace (sessies voltooid vs verwacht + dag-90 gewichtsprojectie op EWMA-trend, #169) en macro-trend (gem. kcal/week met doellijn + eiwitgemiddelde, #159).
- Helpers: `weeklyVolumeSeries`, `prTimeline` (`trainingMetrics.js`); `macroWeeklySeries`, `goalPace` (`dashboardMetrics.js`).

### Changed
- `js/ui/overview.js`: `renderTrainingIntel` uitgebreid + nieuwe `renderProgressIntel`; generieke `sparkBars`-helper. `index.html` kreeg `#progressIntel`-container.

### Data / Migrations
- Geen. Volledig additief en read-only; geen schema- of sync-wijziging.

### Operations
- `CACHE_VERSION` `shred-v16` → `shred-v17`. Frontend bind-mounted, geen rebuild.

### Verification
- `node --check` op `trainingMetrics.js`, `dashboardMetrics.js`, `ui/overview.js`: OK.
- Logica-unittest met mock-modules over 3 weken: volume/week 1640/656/1710, PR-tijdlijn (eerste sessie terecht geen PR), macro/week 5/5/0 gelogde dagen met `null` bij ongelogde week, goal-pace 7/11 = 64% en dag-90 projectie −4,0 kg. Alles matcht handberekening.
- Nog niet handmatig in de browser/PWA geverifieerd.

### Known Issues
- Goal-pace gewichtsprojectie is een rechte EWMA-extrapolatie; gemarkeerd "indicatief" bij < 7 metingen.
- Macro-trend toont alleen kcal-bars (eiwit als gemiddelde-regel), nog geen aparte eiwitgrafiek.

## 2026-06-09 - v1.2.0

### Added
- Body-intelligentie op de Lichaam-tab (read-only over `state.weights`):
  - **EWMA-trendgewicht** (gap-aware, halfLife 10d) als trendcijfer én als grafieklijn (vervangt het simpele 7-daags voortschrijdend gemiddelde — "body trend chart v2");
  - **plateau v2** op basis van de EWMA-trend (minder ruisgevoelig);
  - **weeg-consistentie** (gelogde/mogelijke dagen, laatste 14d);
  - **2-weeks forecast** (EWMA-trend doorgetrokken, geen TDEE-aanname).
- `bodyMetrics.js`-helpers: `ewmaSeries`, `weighInConsistency`, `trendForecast`; `weightMetrics` uitgebreid met `ewma`, `ewmaArr`, `ewmaTrendPerWeek`, `consistency`, `forecast`, `plateauV2`.

### Changed
- `js/ui/body.js`: trend-insight toont nu EWMA-trendgewicht + tempo + plateau/forecast/consistentie; grafieklijn gebruikt EWMA. Grafiek-legenda bijgewerkt.
- Bestaande velden van `weightMetrics` (`avg7`, `avg14`, `trendPerWeek`, `plateau`) ongewijzigd → dashboard/overview blijven werken.

### Data / Migrations
- Geen. Volledig additief en read-only; geen schema- of sync-wijziging.

### Operations
- `CACHE_VERSION` `shred-v15` → `shred-v16`. Frontend bind-mounted, geen rebuild.

### Verification
- `node --check` op `bodyMetrics.js` en `ui/body.js`: OK.
- Logica-unittest van `ewmaSeries`/`weighInConsistency`/`trendForecast`/`weightMetrics` met 14-daagse reeks (incl. gaten) en edge-cases (1 punt, leeg): uitkomsten zoals verwacht (EWMA 84,5; trend −0,27 kg/wk; consistentie 11/14; forecast 83,96; lege/single-point → null).
- Nog niet handmatig in de browser/PWA geverifieerd.

### Known Issues
- Forecast is een rechte extrapolatie van de recente trend; niet geschikt voor lange horizon.
- Consistentie weegt nog niet mee in een expliciete confidence-score.

## 2026-06-09 - v1.1.0

Eerste formeel gelogde release. De staat daarvóór was niet geversioneerd; dit is geen reconstructie van eerdere wijzigingen, alleen de nieuwe.

### Added
- Sectie "Trainingsintelligentie" op het Overzicht-tab met:
  - weekvolume (totaal + per spiergroep) en week-op-week delta;
  - "PR's deze week" met vier PR-soorten per oefening: gewicht, reps, volume en geschatte 1RM (Epley);
  - kniebelasting per laatste krachtsessie (transparante index + band laag/matig/hoog + bijdragende oefeningen).
- Analytics-helpers in `js/trainingMetrics.js`: `estimated1RM`, `sessionPRKinds`, `weekPRSummary`, `weeklyVolume`, `kneeLoadForSession`.

### Changed
- `js/ui/overview.js` rendert de nieuwe sectie via `renderTrainingIntel()`.

### Data / Migrations
- Geen. Volledig additief en read-only over bestaande `state.sets`; geen IndexedDB- of SQLite-wijziging, geen nieuw sync-type.

### Operations
- Frontend is bind-mounted (`./:/usr/share/nginx/html:ro`), dus geen image-rebuild nodig. `CACHE_VERSION` gebumpt `shred-v14` → `shred-v15`; clients herladen de app-shell zodra de nieuwe service worker activeert.

### Verification
- `node --check` op de gewijzigde modules (als ES-module geparsed): OK.
- Logica-unittest van `weeklyVolume`, `sessionPRKinds`, `weekPRSummary`, `kneeLoadForSession` en `estimated1RM` via mock-modules met tweeweeks-setdata; uitkomsten matchen handberekening.
- Nog niet handmatig in de browser/PWA geverifieerd op iPhone/Mac.

### Known Issues
- PR-detectie telt de eerste keer dat een oefening wordt gelogd niet als PR (geen referentie).
- Kniebelasting-index gebruikt vaste categoriefactoren, geen persoonlijke kalibratie.
- RIR wordt nog niet meegewogen in volume/intelligentie.

## Formaat

```markdown
## YYYY-MM-DD - vX.Y.Z

### Added
- Nieuwe functionaliteit.

### Changed
- Gewijzigd gedrag.

### Fixed
- Bugfixes.

### Data / Migrations
- Schemawijzigingen, IndexedDB migraties, backfills of Health Core veranderingen.

### Operations
- Deploy-, backup-, restore- of configwijzigingen.

### Verification
- Welke tests/checks zijn uitgevoerd.

### Known Issues
- Bekende beperkingen of follow-up.
```

## Versieregels

- Patch: bugfix, docs, kleine UI polish zonder contractwijziging.
- Minor: nieuwe feature of nieuw sync-recordtype met backward compatibility.
- Major: breaking schema/contract wijziging of migratie met expliciete voorbereiding.

## Release Checklist

- Docs bijgewerkt.
- `CACHE_VERSION` gebumpt indien frontend shell wijzigde.
- Backend rebuilt indien API/package/env wijzigde.
- Sync getest bij recordwijzigingen.
- Health Core dual-write getest indien geraakt.
- Backup/rollback impact benoemd.
- Geen secrets in release notes.

