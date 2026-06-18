# Product Backlog

Trackbare status van de 200 doelen uit [18_PRODUCT_ROADMAP.md](18_PRODUCT_ROADMAP.md). De roadmap is de canonieke *lijst*; dit bestand houdt de *status* bij. `[x]` = klaar (geïmplementeerd + geverifieerd), `[ ]` = open. Markeer hier af zodra werk gemerged/gedeployed is en voeg nieuw ontdekt werk onderaan toe.

**Stand: 56 klaar · 144 open** (laatst bijgewerkt 2026-06-09, t/m v1.6.0).

## Training (1-25) — 16/25
- [x] 1 Behoud 90-dagen programma
- [x] 2 Documenteer programma-entiteit
- [x] 3 Stabiele exercise IDs
- [x] 4 Setmodel + RIR backward compatible
- [x] 5 Vorige sessie per oefening
- [x] 6 PR-types weight/reps/volume/e1RM
- [x] 7 Volume per spiergroep
- [x] 8 Weekvolume-trends
- [x] 9 Deloadweken in analytics
- [x] 10 Suggested deload verklaarbaar
- [x] 11 Kniebelasting-score per sessie
- [x] 12 Swaps op knieveiligheid
- [ ] 13 Favoriete swaps
- [x] 14 Equipment notes
- [ ] 15 Bodyweight volume-equivalent
- [x] 16 Cardio duration/intensity logging
- [x] 17 Zone 2 hartslagcontext
- [x] 18 Interval workout completion details
- [ ] 19 Missed-session recovery advies
- [ ] 20 Training density
- [ ] 21 Session readiness modifier
- [ ] 22 Exercise progression recommendations
- [ ] 23 Slot-level progression rules
- [ ] 24 Programma templates exporteerbaar
- [ ] 25 Training end-of-phase report

## Nutrition (26-50) — 7/25
- [x] 26 Productgebaseerde food logs
- [x] 27 Historical product macro integrity
- [x] 28 Product search ranking
- [ ] 29 Barcode/label handmatige invoer
- [ ] 30 Recipe versioning
- [ ] 31 Meal template analytics
- [ ] 32 Frequent meal quick-add
- [x] 33 Voice proposal UX
- [x] 34 Pending voice proposals robuust
- [x] 35 Confidence indicator AI lookup
- [ ] 36 Macro data quality score
- [ ] 37 Calorie cycling ontwerp
- [ ] 38 Protein per kg
- [ ] 39 Fiber veld
- [ ] 40 Hydration
- [ ] 41 Weekend compliance analyse
- [ ] 42 Meal timing analyse
- [ ] 43 Training-day/rest-day nutrition comparison
- [ ] 44 Low-protein warnings
- [ ] 45 Calorie trend vs weight trend
- [ ] 46 Product substitution suggestions
- [ ] 47 Shopping/prep hints
- [ ] 48 Nutrition export CSV
- [x] 49 Nutrition weekreview
- [ ] 50 Nutrition phase report

## Recovery (51-75) — 0/25 (heel domein open; hangt aan Health Core read)
- [ ] 51 Recovery data model
- [ ] 52 Apple Health slaap via Core
- [ ] 53 HRV via Core
- [ ] 54 Rusthartslag via Core
- [ ] 55 Stappen via Core
- [ ] 56 Sleep debt
- [ ] 57 HRV baseline
- [ ] 58 RHR baseline
- [ ] 59 Readiness score
- [ ] 60 Readiness evidence
- [ ] 61 Fatigue notes
- [ ] 62 Soreness/pain notes
- [ ] 63 Knie-pijn signaal
- [ ] 64 Deload recovery-aware
- [ ] 65 High-risk day warning
- [ ] 66 Sickness/manual override
- [ ] 67 Recovery trend chart
- [ ] 68 Recovery weekly review
- [ ] 69 Slaap vs trainingsvolume correlatie
- [ ] 70 HRV/RHR vs performance correlatie
- [ ] 71 Recovery recommendations
- [ ] 72 Low-impact cardio fallback
- [ ] 73 Recovery data missing state
- [ ] 74 Recovery export
- [ ] 75 Recovery phase report

## Body (76-100) — 10/25
- [x] 76 Daily weight logging
- [x] 77 7/14-day trendgewicht
- [x] 78 EWMA trendgewicht
- [x] 79 Weigh-in consistency score
- [x] 80 Waist measurement
- [x] 81 Hip/chest/arm measurements
- [x] 82 Measurement sync type
- [x] 83 Photo comparison view
- [ ] 84 Weekly photo completeness
- [ ] 85 Body composition notes
- [ ] 86 Recomposition status
- [x] 87 Trendweight forecast
- [x] 88 Plateau detection v2
- [ ] 89 Rapid-loss warning
- [ ] 90 Correlate calories with trendweight
- [ ] 91 Correlate steps with trendweight
- [ ] 92 Correlate training volume with body trend
- [ ] 93 Phase body report
- [ ] 94 Body export
- [ ] 95 Data plausibility checks
- [ ] 96 Source priority Shred/Apple weight
- [ ] 97 Before/after 90-day report
- [ ] 98 Measurement reminders
- [ ] 99 Body dashboard cards
- [ ] 100 Recomposition confidence score

## AI (101-125) — 3/25
- [x] 101 Structured output voor AI calls
- [x] 102 AI writes preview-first
- [ ] 103 AI weekreview
- [ ] 104 AI nutrition review
- [ ] 105 AI training review
- [ ] 106 AI recovery review
- [ ] 107 AI body trend explanation
- [ ] 108 Evidence references
- [x] 109 Confidence per recommendation
- [ ] 110 Missing-data questions
- [ ] 111 Scenario analysis
- [ ] 112 Product macro correction loop
- [ ] 113 Voice clarification flow
- [ ] 114 Dutch-first coaching tone
- [ ] 115 Deterministic facts block
- [ ] 116 AI cost/error observability
- [ ] 117 Prompt versioning
- [ ] 118 Prompt regression tests
- [ ] 119 Local fallback summaries
- [ ] 120 Safety boundaries
- [ ] 121 No-medical-claims guard
- [ ] 122 Plan adjustment proposals
- [ ] 123 Experiment interpretation
- [ ] 124 End-of-phase AI report
- [ ] 125 Digital twin narrative layer

## Health Core (126-150) — 2/25
- [x] 126 Best-effort dual-write
- [x] 127 Formula versions (gedocumenteerd + via /api/health/core)
- [ ] 128 Read integration client
- [ ] 129 Health Core availability state
- [ ] 130 Lees Apple Health steps
- [ ] 131 Lees sleep
- [ ] 132 Lees HRV
- [ ] 133 Lees RHR
- [ ] 134 Lees VO2max trend
- [ ] 135 Source-aware bodyweight view
- [ ] 136 Experiment registry UI
- [ ] 137 Experiment outcomes
- [ ] 138 Correlation cards
- [ ] 139 Predictions cards
- [ ] 140 Observation drilldown
- [ ] 141 Ingest quality status
- [ ] 142 Quarantine warning
- [ ] 143 Core schema compatibility checks
- [ ] 144 Core backfill reconciliation doc
- [ ] 145 Health Core read cache
- [ ] 146 Offline fallback voor Core reads
- [ ] 147 Core-derived readiness inputs
- [ ] 148 Core-derived daily briefing
- [ ] 149 Health Core backup status
- [ ] 150 Shred/Core contract tests

## Analytics (151-175) — 9/25
- [x] 151 Overview KPI cards (incl. confidence)
- [ ] 152 90-day heatmap filters
- [ ] 153 Training completion heatmap
- [ ] 154 Nutrition compliance heatmap
- [ ] 155 Recovery heatmap
- [x] 156 Body trend chart v2 (EWMA)
- [x] 157 Volume trend chart
- [x] 158 PR timeline
- [x] 159 Macro trend chart
- [x] 160 Weekly report view
- [ ] 161 Phase report view
- [ ] 162 Dashboard empty states
- [ ] 163 Dashboard error states
- [x] 164 Confidence badges
- [ ] 165 Data coverage score
- [ ] 166 Anomaly detection
- [ ] 167 Correlation explanations
- [ ] 168 Experiment dashboard
- [x] 169 Goal pace dashboard
- [x] 170 Knee-risk dashboard
- [ ] 171 Readiness dashboard
- [ ] 172 Exportable report JSON
- [ ] 173 Printable report HTML
- [ ] 174 Dashboard performance budget
- [ ] 175 Analytics test fixtures

## Platform (176-200) — 9/25
- [x] 176 Vanilla frontend
- [x] 177 Node/Express/SQLite stack
- [x] 178 Tailscale-only exposure
- [x] 179 Auth boundary (doc + check-auth-boundary.sh)
- [ ] 180 Optional bearer-auth ontwerp
- [x] 181 Service worker cache discipline
- [ ] 182 SW update UX
- [ ] 183 Sync diagnostics
- [x] 184 Local backup/export UI
- [ ] 185 Migration registry
- [ ] 186 Schema smoke tests
- [x] 187 Sync contract tests (api/test-sync.mjs)
- [ ] 188 Voice route tests
- [ ] 189 Product lookup tests
- [x] 190 Health Core dual-write tests (api/test-core.mjs)
- [ ] 191 Playwright smoke voor PWA
- [ ] 192 Mobile viewport checks
- [ ] 193 Accessibility pass
- [ ] 194 Performance budget
- [ ] 195 Log redaction regels
- [ ] 196 Secrets handling doc
- [ ] 197 Restore runbook
- [ ] 198 Release checklist
- [x] 199 Docs als source of truth actueel (conventie vastgelegd)
- [ ] 200 Digital Fitness Twin milestone review

## Nieuw ontdekt werk (buiten de 200)
- [ ] N1 `MASTER_CONTEXT`-aggregaat copy van nutrition-aggregatie in `api/core.js` blijft handmatig synchroon met `health-core/scripts/lib/aggregate.mjs` — overweeg een gedeelde bron of een parity-test.
- [x] N2 Frontend heeft geen testrunner; logica wordt getest via ad-hoc mock-harnesses. `npm test` draait nu `node --test` smoke-dekking voor `js/*Metrics.js`.
