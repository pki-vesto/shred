# Shred Tracker Documentation

Dit is de permanente bron van waarheid voor Shred Tracker. Nieuwe AI-agents starten hier, lezen daarna de directive en gebruiken de rest als specificatie voordat ze code wijzigen.

**Autonome agents starten in [MASTER_CONTEXT.md](MASTER_CONTEXT.md)**, dat doorlinkt naar de directive, het handbook, de levende status ([CURRENT_STATE.md](CURRENT_STATE.md)), de trackbare backlog ([PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md)) en de milestone-volgorde ([ROADMAP.md](ROADMAP.md)). [ARCHITECTURE.md](ARCHITECTURE.md) is de korte architectuurkaart; de diepe specs staan in de genummerde documenten hieronder.

## Leesvolgorde

1. [03_PROJECT_HANDBOOK.md](03_PROJECT_HANDBOOK.md) - snel begrip van product, status, architectuur, modules en roadmap.
2. [02_AUTONOMOUS_BUILD_DIRECTIVE.md](02_AUTONOMOUS_BUILD_DIRECTIVE.md) - hoogste prioriteit: regels voor autonome ontwikkeling.
3. [01_PRODUCT_VISION.md](01_PRODUCT_VISION.md) - waarom Shred bestaat en waar het naartoe groeit.
4. [04_SYSTEM_ARCHITECTURE.md](04_SYSTEM_ARCHITECTURE.md) en [05_DOMAIN_MODEL.md](05_DOMAIN_MODEL.md) - technische en domeinstructuur.
5. Engine-specificaties: training, nutrition, body composition, recovery, AI coach.
6. Integraties, data lifecycle, analytics, UI/UX en roadmap.

## Documentindex

| Document | Doel |
|---|---|
| [01_PRODUCT_VISION.md](01_PRODUCT_VISION.md) | Productvisie, doelgroep, niet-doelen, digital fitness twin en relatie met Health Core. |
| [02_AUTONOMOUS_BUILD_DIRECTIVE.md](02_AUTONOMOUS_BUILD_DIRECTIVE.md) | Definitie van gereed, verboden gedrag, kwaliteitsregels en doorontwikkelregels. |
| [03_PROJECT_HANDBOOK.md](03_PROJECT_HANDBOOK.md) | Eerste document voor nieuwe agents: status, modules, architectuur en documentkaart. |
| [04_SYSTEM_ARCHITECTURE.md](04_SYSTEM_ARCHITECTURE.md) | Frontend, backend, sync, service worker, voice en AI-architectuur. |
| [05_DOMAIN_MODEL.md](05_DOMAIN_MODEL.md) | Domeinen, entiteiten, relaties en verantwoordelijkheden. |
| [06_TRAINING_ENGINE.md](06_TRAINING_ENGINE.md) | Functionele blauwdruk voor programma's, sessies, sets, swaps, RIR, PR's en deloads. |
| [07_NUTRITION_ENGINE.md](07_NUTRITION_ENGINE.md) | Producten, recepten/templates, macro's, voice logging, AI lookup en compliance. |
| [08_BODY_COMPOSITION_ENGINE.md](08_BODY_COMPOSITION_ENGINE.md) | Gewicht, trendgewicht, foto's, metingen, vetverlies en recompositieanalyse. |
| [09_RECOVERY_ENGINE.md](09_RECOVERY_ENGINE.md) | Slaap, HRV, rusthartslag, vermoeidheid, readiness en deloadsignalen. |
| [10_AI_COACH.md](10_AI_COACH.md) | Huidige en geplande AI-functionaliteit. |
| [11_HEALTH_CORE_INTEGRATION.md](11_HEALTH_CORE_INTEGRATION.md) | Observations, derived metrics, dual-write, sync, experimenten en correlaties. |
| [12_APPLE_HEALTH_INTEGRATION.md](12_APPLE_HEALTH_INTEGRATION.md) | Toekomstig ontwerp voor Apple Health dataflows. |
| [13_UI_UX_GUIDELINES.md](13_UI_UX_GUIDELINES.md) | Design tokens, componenten, states, skeletons, empty en error states. |
| [14_ANALYTICS_AND_DASHBOARDS.md](14_ANALYTICS_AND_DASHBOARDS.md) | Dashboards, KPI's, weekreviews, heatmaps, trends en rapportages. |
| [15_DATA_LIFECYCLE.md](15_DATA_LIFECYCLE.md) | IndexedDB, SQLite, sync, offline queue, backups, exports, migraties en conflicten. |
| [16_FITNESS_INTELLIGENCE_MODEL.md](16_FITNESS_INTELLIGENCE_MODEL.md) | Basis voor vooruitgang, herstel, risico, aanbevelingen en voorspellingen. |
| [17_DIGITAL_FITNESS_TWIN.md](17_DIGITAL_FITNESS_TWIN.md) | Lange termijn eindbeeld van logger naar digital fitness twin. |
| [18_PRODUCT_ROADMAP.md](18_PRODUCT_ROADMAP.md) | Gecanoniseerde 200-doelen roadmap voor Shred. |
| [19_CLAUDE_CODE_GUIDELINES.md](19_CLAUDE_CODE_GUIDELINES.md) | Ontwikkelregels voor agents: dependencies, service worker, sync en tests. |
| [20_RELEASE_NOTES.md](20_RELEASE_NOTES.md) | Formaat voor toekomstige releases. |

## Projectinvarianten

- Shred is single-user, self-hosted, offline-first en persoonlijk.
- Shred is geen SaaS, geen social platform en geen multi-user product.
- Tailscale is de primaire security boundary; de app heeft momenteel geen applicatie-auth.
- IndexedDB is de lokale werkset; SQLite is de server-sync anchor; Health Core is de centrale health datastore voor observations en intelligentie.
- Nieuwe functionaliteit mag bestaande 90-dagen data, sync-records, productlogs, foto's of traininghistorie niet breken.

