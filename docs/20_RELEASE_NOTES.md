# Release Notes

Dit bestand definieert het formaat voor toekomstige releases. Vul geen fictieve releases in. Voeg alleen entries toe wanneer er werkelijk iets is gewijzigd en gedeployed of bewust als release is gemarkeerd.

## Unreleased

Recipe/template versioning (#51 — roadmap-doel 30).

### Added
- Meal templates krijgen additieve versie-metadata (`recipeKey`, `version`, `previousTemplateId`) wanneer dezelfde naam/categorie opnieuw wordt opgeslagen.
- Template picker en templatebeheer tonen `vN` wanneer meerdere versies bestaan.
- Geselecteerde historische templateversies blijven exact toepasbaar.
- Repeatable Node-test `tests/templateVersioning.test.mjs`.

Barcode/label handmatige invoer (#47 — roadmap-doel 29).

### Added
- Optionele barcode- en label/bronvelden bij product aanmaken en bewerken.
- Productzoek matcht nu ook op barcode en labeltekst naast productnaam.
- Productrijen tonen compacte labelmetadata wanneer die aanwezig is.
- Repeatable Node-test `tests/nutritionProductMetadata.test.mjs`.

### Operations
- `CACHE_VERSION` `shred-v28` → `shred-v29` (`css/app.css`, `js/nutrition.js`, `js/ui/food.js` en `service-worker.js` gewijzigd).

### Verification
- `node --test tests/templateVersioning.test.mjs`
- `node --check js/nutrition.js`
- `node --check js/ui/food.js`
- `node --check tests/templateVersioning.test.mjs`
- `node --test tests/nutritionProductMetadata.test.mjs`
- `node --check js/nutrition.js`
- `node --check js/ui/food.js`

Missed-session recovery advies (#45 — roadmap-doel 19).

### Added
- Deterministisch gemiste-krachtsessieadvies in het weekrapport: niet inhalen na één gemiste sessie, conservatief hervatten bij recente missers en volume verlagen wanneer meerdere krachtsessies zijn gemist.
- `missedSessionRecoveryAdvice(day, lookbackDays)` als testbare helper in `js/dashboardMetrics.js`.
- Repeatable Node-test `tests/missedSessionAdvice.test.mjs`.

### Operations
- `CACHE_VERSION` `shred-v28` → `shred-v29` (`js/dashboardMetrics.js` gewijzigd).

### Verification
- `node --test tests/missedSessionAdvice.test.mjs`
- `node --check js/dashboardMetrics.js`
- `node --check tests/missedSessionAdvice.test.mjs`

- N2 Frontend metrics test runner: root `npm test` draait een `node --test` smoke-suite voor `bodyMetrics`, `trainingMetrics`, `dashboardMetrics` en `reportMetrics`.
- N1 Aggregatie-parity: `api/core.js` exporteert de gedeelde Shred/Health Core-aggregatiehelpers expliciet en `api/test-aggregate-parity.mjs` vergelijkt nutrition/session-formules, units, external IDs en metadata tegen een Health Core-snapshot.
- Testcommand: `npm --prefix api test` draait nu aggregate-parity, Health Core dual-write en sync-contract tests.

Calorie cycling targets (#59 — roadmap-doel 37).

### Added
- Nieuwe pure helper `calorieCyclingTargets(goals, delta)` voor training/rust kcal- en macrotargets.
- Overzicht toont read-only calorie-cycling guidance in `Voortgang & tempo`.
- Cycling houdt eiwit stabiel en bewaart het 7-daags gemiddelde rond het basisdoel.
- Repeatable Node-test `tests/calorieCyclingTargets.test.mjs`.

### Operations
- `CACHE_VERSION` `shred-v28` → `shred-v29` (`js/dashboardMetrics.js`, `js/ui/overview.js` en `service-worker.js` gewijzigd).

### Verification
- `node --test tests/calorieCyclingTargets.test.mjs`
- `node --check js/dashboardMetrics.js`
- `node --check js/ui/overview.js`
- `node --check tests/calorieCyclingTargets.test.mjs`
- `node --check service-worker.js`
- `git diff --check`

## 2026-06-15 - v1.12.0

Service-worker update-UX en sync-diagnostics (#19 — platformdoelen 182 en 183).

### Added
- Klikbare update-toast **"Nieuwe versie beschikbaar — tik om te herladen"** wanneer een nieuwe service worker klaarstaat.
- Compacte sync-diagnostiek in Settings: status, laatste sync, laatst toegepaste records, lokale wachtrij en laatste fout.

### Changed
- Service worker wacht nu op de expliciete client-actie voordat `skipWaiting` wordt aangeroepen, zodat de update-UX zichtbaar is.
- Na succesvolle sync-POST worden lokaal verzonden `state.ts`-items opgeruimd, zodat de pending-teller daadwerkelijk naar 0 kan.

### Operations
- `CACHE_VERSION` `shred-v25` → `shred-v26` (shell-assets `css/app.css`, `js/app.js`, `js/sync.js`, `js/ui/components.js`, `js/ui/settings.js` en `service-worker.js` gewijzigd).

### Verification
- `node --check` op `js/app.js`, `js/sync.js`, `js/ui/settings.js`, `js/ui/components.js` en `service-worker.js`: OK.
- Lokale diagnostics-test: pending outbound telt lokale `state.ts` records en daalt na clear; status snapshot bevat `lastApplied`.
## 2026-06-15 - v1.11.0

90-dagen heatmaps voor training en voeding (#18 — roadmap-doelen 152, 153 en 154).

### Added
- Nieuwe **90-dagen heatmap** op Overzicht met toggle voor `Training` en `Voeding`.
- Trainingslaag onderscheidt voltooid, gemist, rust en toekomst; voedingslaag toont compliance-intensiteit en onderscheidt ongelogde dagen van lage score.
- `nutritionScoreForDay(day)` en `trainingHeatmapStatus(day)` als pure helpers in `js/dashboardMetrics.js`.

### Operations
- `CACHE_VERSION` `shred-v24` → `shred-v25` (shell-assets `css/app.css`, `index.html`, `js/dashboardMetrics.js` en `js/ui/overview.js` gewijzigd).

### Verification
- `node --check` op `js/dashboardMetrics.js`, `js/ui/overview.js` en `service-worker.js`: OK.
- Lokale logica-test: ongelogde voeding geeft `null`, gelogde voeding score 0-100, gemiste K-dag classificeert als `missed`, R-dag als `rest`.
## 2026-06-15 - v1.10.0

Weekend- en trainingsdag/rustdag-voedingsanalyse op Overzicht (#14 — roadmap-doelen 41 en 43).

### Added
- Nieuwe kaart **Voedingscontext** in `Voortgang & tempo`: vergelijkt weekend vs doordeweeks en trainingsdag vs rustdag op gemiddelde kcal en eiwit, inclusief kcal-delta en confidence-badge bij dunne data.
- Nieuwe pure helper `nutritionContextSplit(uptoDay)` in `js/dashboardMetrics.js`; read-only over bestaande `state.foods`, `dateForDay(day)` en `sessionFor(date)`.

### Operations
- `CACHE_VERSION` `shred-v23` → `shred-v24` (shell-assets `css/app.css`, `js/dashboardMetrics.js` en `js/ui/overview.js` gewijzigd).

### Verification
- `node --check` op `js/dashboardMetrics.js`, `js/ui/overview.js` en `service-worker.js`: OK.
- Lokale logica-test met mock-state: hogere weekend-kcal geeft positieve weekend-delta; hogere K-dag-kcal geeft positieve trainingsdag-delta; lege state geeft fallback zonder `NaN`.
## 2026-06-15 - v1.9.0

Per-domein CSV-export voor voeding en lichaam (#16 — roadmap-doelen 48 en 94).

### Added
- Nieuwe Settings-knoppen **Voeding exporteren (CSV)** en **Lichaam exporteren (CSV)** naast de bestaande JSON-backup.
- Nieuwe pure CSV-builders in `js/export.js`: voeding per food-log-item met macro's; lichaam per dag met gewicht en metingen. CSV-cellen worden quote-safe geescaped.

### Operations
- `CACHE_VERSION` `shred-v22` → `shred-v23`; nieuw shell-asset `js/export.js` toegevoegd.

### Verification
- `node --check` op `js/export.js`, `js/ui/settings.js` en `service-worker.js`: OK.
- Lokale CSV-logica-test met productnaam met komma/quotes: kolomtelling blijft correct; lege voeding/lichaam-state levert geen downloadbare CSV.

## 2026-06-15 - v1.8.0

Favoriete oefening-swaps (#17 — roadmap-doel 13).

### Added
- Ster-toggle in de oefening-swap-sheet: favoriete varianten verschijnen bovenaan binnen hun knieveiligheidsgroep.
- Nieuw gesynct meta-veld `favoriteExercises`, via hetzelfde meta-syncpad als `slotDefaults`.

### Operations
- `CACHE_VERSION` `shred-v21` → `shred-v22` (shell-assets `css/app.css`, `js/state.js`, `js/sync.js`, `js/exercises.js` en `js/ui/swap.js` gewijzigd).

### Verification
- `node --check` op `js/state.js`, `js/sync.js`, `js/ui/swap.js`, `js/exercises.js` en `service-worker.js`: OK.
- Lokale logica-test: meta read/write round-trip bewaart favorieten; een favoriete knie-onvriendelijke oefening komt niet boven een knieveilige niet-favoriet.

## 2026-06-15 - v1.7.0

Calorie-trend vs gewichtstrend-kaart op Overzicht (#15 — roadmap-doel 45).

### Added
- **Calorieën vs gewichtstrend**-kaart in `Voortgang & tempo` (Overzicht): zet het 14-daagse caloriegemiddelde naast de EWMA-gewichtstrend met een regelgebaseerde, niet-causale verdict-tekst ("consistent met een cut" / "plateau ondanks lage inname" / "inname boven onderhoud" / "vlak — observeer nog ~1 week"). Confidence-badge bij dunne data (<3 gelogde dagen of <3 weegmomenten).
- Nieuwe pure helper `calorieVsWeight(uptoDay, windowDays = 14)` in `js/dashboardMetrics.js`; read-only, hergebruikt `weightMetrics(state.weights)` en `dayTotals(d)`. Geen TDEE-claim, geen causale taal.

### Operations
- `CACHE_VERSION` `shred-v20` → `shred-v21` (shell-asset `js/dashboardMetrics.js` + `js/ui/overview.js` gewijzigd).

### Verification
- `node --check` op `js/dashboardMetrics.js`, `js/ui/overview.js` en `service-worker.js`: OK.
- Logica-rondgang met mock-state: (a) dalend gewicht + 2100 kcal → "consistent met een cut"; (b) `plateauV2` + lage kcal → "Plateau ondanks lage inname"; (c) lege state → empty-state zonder `NaN`; (d) trend ≈ 0 → "observeer nog ~1 week".

## 2026-06-09 - v1.6.0

M3-b: cardio duration/intensity logging als nieuw sync-type (#16, #17, #18).

### Added
- **Cardio-logging** op cardio-dagen (Vandaag-tab): duur, RPE, gem. HR, intervallen (bij CI) + notitie. Een gelogde duur markeert de dag automatisch voltooid.
- **Zone-2 hartslagcontext** (#17): optionele max-HR in de doelen (Settings); bij CZ-sessies een zone-2 doelbereik (60–70%) met een in/onder/boven-zone-flag voor de gelogde HR.
- Nieuw sync-recordtype **`cardio`** (key `<day>`, value `{durationMin,rpe,avgHr,intervalsDone,note}`, LWW), end-to-end: client `state.cardio` + `mutate`/read/write, server tabel + `TYPES`-handler + index.
- Health Core dual-write van cardio-duur naar **`fitness.cardio_minutes`** (min).

### Changed
- `goals` meta draagt nu optioneel `maxHr` (rijdt mee op de bestaande goals-sync; backward compatible).
- `api/test-core.mjs` uitgebreid met cardio-dual-write assert.

### Data / Migrations
- Additief: nieuwe tabel `cardio` + index; nieuwe `state.cardio` default `{}`; nieuwe `fitness.cardio_minutes` metric_type via idempotente seed. Geen wijziging aan bestaande tabellen/records.

### Operations
- `CACHE_VERSION` `shred-v19` → `shred-v20`. `shred-api` image herbouwd + herstart.

### Verification
- `node --check` op alle 8 gewijzigde modules: OK.
- `api/test-core.mjs` in verse container: groen incl. `fitness.cardio_minutes`=32 op dag 6.
- `api/test-sync.mjs`: groen. Extra cardio sync round-trip via de echte router: `accepted 1`, round-trip `durationMin 32 / avgHr 138 / intervalsDone 8` correct.
- Live-serve van v20 geverifieerd. Nog niet handmatig in de browser/PWA.

### Known Issues
- Zone-2 bereik gebruikt vaste 60–70%-band op max-HR; geen lactaat/HRV-kalibratie.
- Cardio-detail verschijnt nog niet als aparte analytics-kaart (duur gaat wel naar Health Core).

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
