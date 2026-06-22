# Current State

Levende status van Shred Tracker. Bijgewerkt bij elke milestone. Details staan in de genummerde docs; dit is het snelle overzicht.

**Laatst bijgewerkt:** 2026-06-18 · **Release:** v1.12.0 + unreleased calorie cycling + backlogreconciliatie favoriete swaps + API/frontend-testupdate · **SW cache:** `shred-v29` · **Backlog:** 57/200 + N1/N2 klaar (zie [PRODUCT_BACKLOG.md](PRODUCT_BACKLOG.md)).

## Live deployment
- Frontend (`shred`, nginx) is **bind-mounted** (`./:/usr/share/nginx/html:ro`) → wijzigingen direct live; clients herladen bij SW-versiebump.
- `shred-api` is een **gebouwde image** → api-wijzigingen vereisen `docker compose build shred-api && docker compose up -d shred-api`.
- Bereikbaar via Tailscale Serve op `https://shred.tail9d0c71.ts.net`; intern via Caddy (:80) en nginx-fallback (:8088). API/Whisper hebben geen host-poort.

## Geïmplementeerd (hoofdlijnen)
- 90-dagen programma, set/RIR-logging, PR-detectie, swaps met knieveiligheid + equipment-chips + favoriete oefening-swaps.
- Trainingsintelligentie (Overzicht): weekvolume + per groep + WoW-delta, volume-trend, PR-tijdlijn, kniebelasting + historie.
- Voortgang & tempo: goal-pace (dag-90 projectie), macro-trend en read-only calorie cycling targets.
- Weekrapport met confidence per item + één aanbeveling; KPI's met confidence-badges.
- Voeding: productbibliotheek, gerankte zoek, templates, AI macro-lookup, voice-logging met confidence-pills.
- Lichaam: gewicht + EWMA-trendgewicht (grafiek), plateau v2, consistentie, forecast, foto's, **lichaamsmetingen** (taille/heup/borst/arm/dij).
- Training: cardio-logging (duur/RPE/HR/intervallen) met zone-2 hartslagcontext (optionele max-HR in doelen).
- Sync: LWW per recordtype (`meta, day_log, sets, exercise_notes, weights, foods, product, template, slot_choices, measurements, cardio`) + photos.
- Health Core Fase A dual-write (bodyweight, nutrition aggregates, session volume, body.* metingen, cardio-minuten); status via `GET /api/health/core`.

## In uitvoering / net af
- v1.6.0: M3-b cardio-logging (nieuw `cardio` sync-type + zone-2 context + Core dual-write `fitness.cardio_minutes` + tests).
- v1.5.0: M3-a lichaamsmetingen (nieuw `measurements` sync-type, end-to-end + Core dual-write + tests).

## Verificatie-status
- Geautomatiseerd: `npm test` (frontend metrics), `npm --prefix api test` (aggregate-parity, dual-write, sync-contract), `api/check-auth-boundary.sh` (poortgrens), `node --check` + ad-hoc mock-harnesses voor overige frontend-logica.
- **Openstaand**: handmatige browser/PWA-verificatie op iPhone/Mac van de recente UI (analytics-secties, confidence-badges, voice-UX, metingen, sync tussen devices). Logica + serve + api zijn wel geverifieerd.

## Bekende gaten / volgende prioriteiten
Zie [ROADMAP.md](ROADMAP.md). Kort: M4 Health Core read-integratie (#128-135) als poort naar Recovery (#51-75) en AI-reviews (#103-107); M3-c voeding-velden (fiber/hydration) als kleinere additieve tussenstap.
