# Product Vision

## Waarom Shred Bestaat

Shred Tracker bestaat om Peter's fitnessbeslissingen te ondersteunen tijdens en na een 90-dagen recompositie. Het product vervangt losse notities, losse macro-apps, losse trainingslogs en ruwe health dashboards door één persoonlijk fitness operating system.

De kern is niet logging om het loggen. De kern is betere feedback: welke trainingsprikkel werkt, waar ontstaat herstelrisico, hoe betrouwbaar is de voedingstrend, en welke actie heeft vandaag de hoogste opbrengst?

## Productvisie

Shred is een persoonlijke, offline-first fitness cockpit voor een ervaren sporter. Het systeem moet snel genoeg zijn voor gebruik in de gym, betrouwbaar genoeg voor dagelijkse voeding en rijk genoeg om over weken en maanden patronen te herkennen.

Het product werkt voor één gebruiker: Peter. Alle aannames, defaults en waarschuwingen mogen daarom persoonlijk zijn:

- 1,83 m, circa 80 kg.
- 20+ jaar trainingservaring.
- Huidige focus: 90 dagen recompositie.
- Rechterknieblessure, dus kniebelasting is een expliciete constraint.
- Gebruikt iPhone PWA in de praktijk en Mac voor analyse/onderhoud.
- Health Core is de centrale datastore voor health observations.

## Einddoel

Het einddoel is een Digital Fitness Twin: een lokaal, persoonlijk model van Peter's training, voeding, lichaamssamenstelling en herstel dat:

- actuele status toont;
- trends interpreteert;
- risico's signaleert;
- hypotheses bijhoudt;
- aanbevelingen onderbouwt;
- de relatie tussen gedrag en uitkomst steeds beter leert.

Shred blijft daarbij een hulpmiddel. Het neemt geen medische beslissingen, vervangt geen arts/fysio en mag geen schijnzekerheid verkopen.

## Doelgroep

Primaire doelgroep: Peter.

Secundaire doelgroep: toekomstige AI-agents die het project doorontwikkelen. Deze docs moeten agents genoeg context geven om wijzigingen veilig te maken zonder telkens de oorspronkelijke productbrief te kennen.

## Niet-Doelen

Shred is niet:

- een SaaS-product;
- een social network;
- een coach marketplace;
- een multi-user platform;
- een public API;
- een generieke fitness-app voor onbekende gebruikers;
- een medische diagnose-app;
- een caloriepolitie;
- een framework-experiment.

Functionaliteit die alleen zinvol is voor multi-user, billing, onboarding, share feeds, public profiles of admin panels hoort niet in Shred.

## Digital Fitness Twin Visie

De digital twin groeit in lagen:

1. **Historie:** training, voeding, gewicht, foto's, recovery en Health Core observations worden volledig en consistent bewaard.
2. **Status:** het systeem toont wat nu waar is: weekvolume, caloriecompliance, trendgewicht, herstelstatus.
3. **Interpretatie:** het systeem vertaalt signalen naar betekenis: plateau, onderherstel, te agressief gewichtsverlies, productieve overload.
4. **Voorspelling:** het systeem geeft probabilistische vooruitzichten: verwacht gewicht, readiness, blessurerisico, haalbaarheid van doelen.
5. **Aanbeveling:** het systeem stelt kleine acties voor met reden, onzekerheid en verwachte impact.

Zie [17_DIGITAL_FITNESS_TWIN.md](17_DIGITAL_FITNESS_TWIN.md) en [16_FITNESS_INTELLIGENCE_MODEL.md](16_FITNESS_INTELLIGENCE_MODEL.md).

## Relatie Met Health Core

Shred is het domeinsysteem voor fitnessgedrag. Health Core is de centrale health datastore en intelligentielaag voor observations.

Huidige relatie:

- Shred bewaart granulair domeindata in `shred.db`: sets, foods, producten, gewicht, daglogs, foto's.
- Shred dual-writet geaccepteerde sync-records best-effort naar Health Core `observations`.
- Health Core ontvangt nu onder andere `body.weight`, `fitness.session_volume`, `nutrition.calories`, `nutrition.protein`, `nutrition.carbs` en `nutrition.fat`.
- Health Core is additive-only en mag de primaire Shred-sync nooit blokkeren.

Toekomstige relatie:

- Health Core levert Apple Health observations terug aan Shred-analyse.
- Shred blijft de UX en domeinworkflow.
- Health Core wordt de lange termijn correlatie-, experiment- en prediction-layer.

