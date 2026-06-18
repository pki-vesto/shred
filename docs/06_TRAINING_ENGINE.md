# Training Engine

## Doel

De training engine beschrijft hoe Shred trainingsplanning, uitvoering en progressie begrijpt. Dit document is de blauwdruk voor toekomstige uitbreiding van het huidige 90-dagen programma naar een adaptief fitness intelligence systeem.

## Programma's

Huidig programma:

- 90 dagen.
- Startdatum in `meta.startDate`.
- Dagnummer via `dateForDay()` en `todayNum()`.
- Weekindeling: K1, CI, R, K3, CZ, K5, R.
- Hardcoded deloadblokken: dag 29-35 en dag 64-70.

Toekomstige programma-entiteit:

- `program.id`
- `name`
- `goal` zoals recomposition, cut, maintenance, strength block.
- `durationDays`
- `startDate`
- `status`
- `constraints` zoals knieblessure.
- `progressionModel`

## Trainingsdagen

Een programmadag is de centrale sleutel voor training. Alle logs gebruiken programmadag in plaats van kalenderdatum. Kalenderdatum wordt afgeleid uit `startDate`.

Dagtypes:

- Kracht: slots, sets, completion, notities.
- Cardio intervals (CI): duur, RPE, gem. HR, intervallen voltooid + notitie — sync-type `cardio`.
- Zone 2 cardio (CZ): duur, RPE, gem. HR + notitie; toont een zone-2 doelbereik (60–70% van de optionele max-HR in `goals.maxHr`) en flagt of de gelogde HR in zone valt.
- Rustdag: herstelgedrag en optionele wandeling.

Cardio-detail leeft in `state.cardio[day] = { durationMin, rpe, avgHr, intervalsDone, note }` (eigen sync-type, LWW). De bestaande completion-boolean (`completed[day].cardio`) blijft de bron voor streak/voltooiing; een gelogde duur markeert de dag automatisch voltooid. Health Core dual-write spiegelt de duur naar `fitness.cardio_minutes` (min).

## Slots

Een slot is een positie-stabiele plek binnen een sessie. Het heeft:

- `id`
- `category`
- `default`
- `sr` set/rep prescription
- `rest`

Completion blijft per index opgeslagen als `completed[day]['ex' + i]`. Daarom mogen slotposities niet zomaar herschikt worden zonder migratie.

## Oefeningen

Oefeningen staan in `js/exercises.js` en hebben:

- stabiele `id`
- naam
- categorie
- `knee_safe`
- notes

Regel: wijzig bestaande IDs niet. Een barbell bench en dumbbell bench zijn verschillende oefeningen met eigen historie.

Equipmenttype wordt getoond als chip in de Vandaag- en swap-UI (`equipmentFor` in `js/exercises.js`). Het wordt afgeleid uit de naam (barbell/dumbbell/machine/kabel/kettlebell/band/ring/lichaamsgewicht/cardio); een expliciet `ex.equipment`-veld overschrijft de inferentie waar die te grof is.

## Swaps

Swaps lossen een slot op naar een concrete oefening:

1. `slotChoices[day][slotId]`
2. `slotDefaults[slotId]`
3. `slot.default`

Alleen oefeningen in dezelfde categorie zijn geldig. Knievriendelijke varianten staan bovenaan.

## Sets

Huidige setvorm:

- gewicht `w`
- reps `r`
- RIR in UI/select waar beschikbaar

Sets worden opgeslagen per `sets[exerciseId] = [{ day, sets: [...] }]` en server-side als recordtype `sets` met key `<exId>:<day>`.

Toekomstige setvorm:

```json
{
  "w": "80",
  "r": "8",
  "rir": "2",
  "tempo": null,
  "notes": "",
  "completedAt": null
}
```

Nieuwe velden moeten backward compatible zijn.

## RIR

RIR is de gewenste intensiteitsmaat omdat Peter ervaren genoeg is om reps-in-reserve te gebruiken. RIR moet worden gebruikt voor:

- load progression;
- fatigue detection;
- deload recommendations;
- comparing performance at similar effort.

RIR ontbreekt in oudere data. Analyses moeten onbekende RIR accepteren.

## Notities

Notities bestaan op twee niveaus:

- dagnotities in `day_log.notes`;
- oefeningnotities in `exercise_notes`.

Notities zijn belangrijk voor blessures, techniek, equipment en context. AI mag notities gebruiken als zachte evidence, nooit als harde meetwaarde.

## PR's

Per-set badge in de Vandaag-tab (`prForSet`):

- hoogste gewicht wint;
- bij gelijk gewicht wint meer reps;
- vergelijking gebeurt tegen eerdere sets vóór dezelfde dag.

Sessie-niveau PR-detectie in de analytics (`sessionPRKinds` / `weekPRSummary`, getoond als "PR's deze week" op het Overzicht) herkent vier soorten t.o.v. álle eerdere ingevulde sessies van de oefening:

- **weight** — zwaarste set zwaarder dan ooit;
- **reps** — meeste reps in één set ooit;
- **volume** — hoogste sessievolume (Σ gewicht·reps) ooit;
- **e1RM** — hoogste geschatte 1RM ooit (Epley: `w·(1+reps/30)`).

De eerste keer dat een oefening gelogd wordt telt niet als PR (geen referentie).

Nog toekomstig:

- reps-at-weight PR (reps bij een specifiek gewicht);
- density PR;
- technical PR, handmatig gemarkeerd.

## Progressie

Progressie moet per concrete oefening worden bepaald. Basisregels:

- Rep-range model: eerst reps binnen range opbouwen, daarna gewicht verhogen.
- RIR-aware: verhoog alleen als top sets binnen gewenste RIR blijven.
- Knieconstraint: geen agressieve quad progression als pijn/notities/Health Core recovery negatief zijn.
- Swaps breken progressie niet; ze starten of vervolgen de historie van hun eigen exerciseId.

## Volume

Huidige volumeformule:

`volume = gewicht * reps`, gesommeerd over sets.

Gebruik:

- sessievolume (`sessionSummary`);
- volume per spiergroep/categorie;
- weekvolume-trend met week-op-week delta (`weeklyVolume`, getoond op het Overzicht);
- Health Core dual-write `fitness.session_volume`.

Volume is nuttig maar niet volledig: bodyweight oefeningen, machines en RIR vragen extra context.

## Kniebelasting

`kneeLoadForSession` berekent per krachtsessie een transparante kniebelasting-index uit de gelogde sets: knie-relevante categorieën tellen mee via vaste factoren (`quad` 1, `hinge`/`glute` 0,4, `calf` 0,2) en `knee_safe: false`-oefeningen krijgen een extra factor 1,5. De band is regelgebaseerd, geen black-box:

- **hoog** — er is volume gelogd op een knie-onvriendelijke oefening;
- **matig** — directe quad-belasting (alleen knievriendelijk);
- **laag** — alleen indirecte knie-betrokkenheid (hinge/glute/calf).

De bijdragende oefeningen worden altijd getoond zodat het oordeel navolgbaar is. Dit operationaliseert de directive-eis "kniebelasting expliciet bewaken".

## Deloads

Huidig:

- Hardcoded deloadweken dag 29-35 en 64-70.
- `suggestedDeload` in meta voor voorgestelde weken.

Toekomstig deloadmodel gebruikt:

- dalende performance bij gelijke RIR;
- stijgend volume zonder herstel;
- HRV daling;
- rusthartslag stijging;
- slaaptekort;
- knie-notities of pijnsignalen;
- agressief gewichtsverlies;
- lage nutrition compliance.

Zie [09_RECOVERY_ENGINE.md](09_RECOVERY_ENGINE.md) en [16_FITNESS_INTELLIGENCE_MODEL.md](16_FITNESS_INTELLIGENCE_MODEL.md).

## Gemiste Sessies

Gemiste krachtsessies worden deterministisch afgeleid uit de geplande K-dagen
voor vandaag die nog niet volledig zijn afgevinkt. `missedSessionRecoveryAdvice`
gebruikt een korte terugkijkperiode en geeft hersteladvies zonder AI:

- één gemiste sessie gisteren: niet inhalen, hervat de eerstvolgende
  krachtsessie conservatief met 1 RIR extra op de hoofdlift;
- één gemiste sessie van 2-3 dagen oud: volg de planning en voeg hoogstens één
  back-off set toe als de hoofdsets fris voelen;
- meerdere gemiste sessies: ritme gaat boven volume, stapel geen inhaalsessies
  en verlaag de eerstvolgende sessie met ongeveer 2 sets per grote lift;
- oudere gemiste sessie: laten liggen en weekritme beschermen.

Het advies verschijnt in het weekrapport op Overzicht en heeft voorrang op de
generieke weekaanbeveling, zodat herstel na gemiste sessies concreet blijft.
