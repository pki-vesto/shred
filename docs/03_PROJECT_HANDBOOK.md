# Project Handbook

Dit is het eerste document dat een nieuwe AI-agent leest.

## Wat Shred Is

Shred Tracker is Peter's persoonlijke fitness operating system. Het is een single-user, self-hosted, offline-first PWA voor training, voeding, body composition, herstel en fitness intelligence.

Het project is bewust klein qua stack:

- Vanilla HTML/CSS/JS.
- IndexedDB lokaal.
- Service worker voor app shell/offline gebruik.
- Node 22 + Express 5 API.
- SQLite via better-sqlite3.
- Docker op Ubuntu.
- Tailscale als netwerkgrens.
- Whisper self-hosted voor spraak.
- Claude Haiku voor structured AI parsing.
- Health Core als centrale health datastore.

## Huidige Status

Huidige geïmplementeerde hoofdfeatures:

- 90-dagen programma met dagnummering vanaf `meta.startDate`.
- Vandaag-tab met kracht/cardio/rustdag workflows.
- Trainingsslots met default oefeningen, favoriete swap-varianten en swaps per dag of per slot-default, met afgeleide equipment-chip per oefening.
- Oefeninghistorie per concrete `exerciseId`.
- Setlogging met gewicht, reps, RIR-select en PR-detectie.
- Dagcompletion en notities.
- Voeding met productbibliotheek, macros per 100g, macrokwaliteit, optionele barcode/labelmetadata, maaltijdcategorieën, frequent meal quick-add en versioned meal templates met usage analytics; gerankte productzoek (matchkwaliteit + gebruik + barcode/label).
- Product lookup via Claude Haiku met preview en confidence-indicator.
- Voice meal logging via browser mic, Whisper en Claude, met confidence-pills en per-100g check voor nieuwe producten.
- Offline voice queue in IndexedDB.
- Body-tab met gewicht, foto's en trendberekeningen: EWMA-trendgewicht (ook als grafieklijn), plateau v2, weeg-consistentie en 2-weeks forecast.
- Lichaamsmetingen (taille/heup/borst/arm/dij) als eigen sync-type `measurements`, met taille-trend en Health Core dual-write naar `body.*` (cm).
- Cardio-logging (duur/RPE/gem. HR/intervallen) als eigen sync-type `cardio`, met zone-2 hartslagcontext (optionele max-HR) en dual-write naar `fitness.cardio_minutes`.
- Overview/dashboard met week-KPI's (incl. confidence-badges) en een volledig weekrapport (training, lichaam, voeding, eiwit, herstel) met één concrete aanbeveling en deterministisch hersteladvies na gemiste krachtsessies.
- Trainingsintelligentie op het Overzicht: weekvolume + per spiergroep met week-op-week delta, volume-trend per week, PR-tijdlijn (gewicht/reps/volume/e1RM) en kniebelasting per laatste krachtsessie met historie-stippen.
- Voortgang & tempo op het Overzicht: goal-pace (sessies voltooid vs verwacht + dag-90 gewichtsprojectie), macro-trend (gem. kcal per week vs doel) en read-only calorie cycling targets.
- Sync tussen iPhone en Mac via `/api/sync` en `/api/photos`.
- Health Core dual-write voor bodyweight, nutrition aggregates en session volume, met `GET /api/health/core` voor status + formuleversies.

## Architectuur In Een Zin

De browser is de primaire werkplek en bewaart direct in IndexedDB; de backend synchroniseert LWW-records naar SQLite; Health Core krijgt best-effort observation aggregates; Tailscale bepaalt wie de app kan bereiken.

## Belangrijke Modules

| Pad | Rol |
|---|---|
| `index.html` | App shell en tabstructuur. |
| `css/app.css` | Volledig design system en component styling. |
| `service-worker.js` | Shell/photo caching en API pass-through. |
| `js/app.js` | Client bootstrap, tab switching, sync status en SW registratie. |
| `js/state.js` | In-memory state, IndexedDB persistence, mutation timestamps. |
| `js/sync.js` | Periodieke LWW-sync, voice queue verwerking, photo sync. |
| `js/sessions.js` | Programma en sessies. |
| `js/exercises.js` | Oefeningencatalogus, categorieën, knieveiligheid. |
| `js/helpers.js` | Programmadagen, datums, slotresolutie en historiehelpers. |
| `js/nutrition.js` | Producten, macro's, food logs, templates, seed en migratie. |
| `api/db.js` | SQLite schema en database-init. |
| `api/routes/sync.js` | Sync contract en LWW apply. |
| `api/core.js` | Health Core dual-write. |
| `api/routes/voice.js` | Voice meal logging pipeline. |
| `api/routes/products.js` | AI macro lookup. |

## Roadmap Samenvatting

De roadmap in [18_PRODUCT_ROADMAP.md](18_PRODUCT_ROADMAP.md) groepeert 200 doelen in acht domeinen:

- Training
- Nutrition
- Recovery
- Body
- AI
- Health Core
- Analytics
- Platform

Huidige prioriteitslijn:

1. Datafundament consolideren.
2. Training engine verdiepen.
3. Nutrition logging sneller en betrouwbaarder maken.
4. Health Core read integration toevoegen.
5. Recovery en Apple Health-data integreren.
6. Fitness intelligence en AI coach uitbreiden.

## Documentkaart

- Product en autonomie: [01_PRODUCT_VISION.md](01_PRODUCT_VISION.md), [02_AUTONOMOUS_BUILD_DIRECTIVE.md](02_AUTONOMOUS_BUILD_DIRECTIVE.md).
- Techniek en data: [04_SYSTEM_ARCHITECTURE.md](04_SYSTEM_ARCHITECTURE.md), [15_DATA_LIFECYCLE.md](15_DATA_LIFECYCLE.md).
- Domeinen en engines: [05_DOMAIN_MODEL.md](05_DOMAIN_MODEL.md) t/m [10_AI_COACH.md](10_AI_COACH.md).
- Integraties: [11_HEALTH_CORE_INTEGRATION.md](11_HEALTH_CORE_INTEGRATION.md), [12_APPLE_HEALTH_INTEGRATION.md](12_APPLE_HEALTH_INTEGRATION.md).
- UX en dashboards: [13_UI_UX_GUIDELINES.md](13_UI_UX_GUIDELINES.md), [14_ANALYTICS_AND_DASHBOARDS.md](14_ANALYTICS_AND_DASHBOARDS.md).
- Intelligence: [16_FITNESS_INTELLIGENCE_MODEL.md](16_FITNESS_INTELLIGENCE_MODEL.md), [17_DIGITAL_FITNESS_TWIN.md](17_DIGITAL_FITNESS_TWIN.md).
- Development: [19_CLAUDE_CODE_GUIDELINES.md](19_CLAUDE_CODE_GUIDELINES.md), [20_RELEASE_NOTES.md](20_RELEASE_NOTES.md).
