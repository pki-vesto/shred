# Roadmap

De canonieke 200-doelen lijst staat in [18_PRODUCT_ROADMAP.md](18_PRODUCT_ROADMAP.md); de afvink-status in [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md). Dit bestand houdt de **milestone-volgorde en prioriteit** bij.

## Prioriteitslijn (handbook)
1. Datafundament consolideren ✅
2. Training engine verdiepen ✅ (analytics-laag)
3. Nutrition logging sneller/betrouwbaarder ✅ (basis + ranking/voice)
4. Health Core read-integratie toevoegen ← poort naar 5 en AI-reviews
5. Recovery + Apple Health-data integreren
6. Fitness intelligence + AI coach uitbreiden

## Milestones
- **M1 — Training-intelligentie** ✅ v1.1.0 (#6/#8/#11)
- **M2 — Intelligentie over bestaande data** ✅ v1.2.0–v1.3.0 (#78/#79/#87/#88/#156/#157/#158/#159/#169/#170)
- **Deeltaken afgemaakt** ✅ v1.4.0 (#14/#28/#33/#49/#109/#127/#151/#160/#164/#179/#190/#199)
- **M3-a — Lichaamsmetingen** ✅ v1.5.0 (#80/#81/#82, + #187)
- **M3-b — Cardio logging** ✅ v1.6.0 (#16/#17/#18; nieuw `cardio` sync-type + zone-2 context)
- **M3-c — Voeding-velden** ⬜ (#39 fiber additief productveld, #40 hydration sync-type)
- **M4 — Health Core read-integratie** ⬜ (#128/#129 client+availability, #130-135 inlezen)
- **M5 — Recovery** ⬜ (#51-75; hangt aan M4)
- **M6 — AI-coachlaag** ⬜ (#103-125; deterministic facts → AI-interpretatie, preview-first)
- **M7 — Platform/kwaliteit** ⬜ (#162/#163 empty/error states, #182 SW-update-UX, #186/#188/#189/#191-198 tests/runbooks)

## Volgende
**M4 — Health Core read-integratie** (#128/#129): read-client + availability-state. Grootste deblokker — opent Recovery (#51-75), source-aware bodyweight (#135) en AI-reviews (#103-107). Begin met een defensieve `coreRead`-client + `/api/health/core`-uitbreiding die beschikbare metric-summaries teruggeeft, en een UI-availabilitystatus. M3-c (fiber/hydration) is een kleinere additieve tussenstap als M4 te groot blijkt voor één iteratie.
