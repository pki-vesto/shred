# Apple Health Integration

## Doel

Apple Health moet recovery, activiteit en body data naar Health Core brengen. Shred gebruikt die data vervolgens voor dashboards, readiness en intelligence.

## Architectuur

```mermaid
flowchart LR
  AH[Apple Health] --> Export[Auto Health Export / shortcut]
  Export --> HCAPI[Health Core ingest]
  HCAPI --> Core[(core.db observations)]
  Core --> HCRead[Health Core read API]
  HCRead --> Shred[Shred dashboards/readiness]
```

Shred schrijft Apple Health-data niet direct. Health Core is de ingest boundary.

## Gewicht

Bronnen:

- Shred manual weight.
- Apple Health weight.

Conflictregel:

- Shred manual is domeinrelevant tijdens programma.
- Apple Health kan aanvullend zijn.
- Health Core bewaart source apart; dashboards kunnen bronprioriteit kiezen.

## Stappen

Metric:

- `activity.steps`

Gebruik:

- energy expenditure context;
- compliance met rustdagwandeling;
- correlatie met vetverlies;
- herstelbelasting.

## HRV

Metric:

- `recovery.hrv_sdnn`

Gebruik:

- readiness baseline;
- deloadsignaal;
- stress trend.

## Rusthartslag

Metric:

- `recovery.resting_heart_rate`

Gebruik:

- fatigue/stress;
- ziektewaarschuwing;
- HRV-context.

## Slaap

Metrics:

- `sleep.duration`
- `sleep.in_bed`
- later eventueel sleep stages.

Gebruik:

- sleep debt;
- readiness;
- performance explanation.

## Workouts

Apple Health workouts kunnen worden gebruikt als externe activiteit:

- wandelen;
- fietsen;
- roeien;
- hardlopen indien knie relevant.

Shred krachttraining blijft leidend voor gym-sets. Apple workout data mag dit niet overschrijven.

## VO2max

Metric:

- `cardio.vo2max`

Gebruik:

- lange termijn cardiofitness trend;
- niet gebruiken voor dagadvies zonder context;
- nuttig voor recomposition health context.

## Datastromen

1. Apple Health exporteert records.
2. Health Core ingest valideert en quarantainet slechte records.
3. Health Core normaliseert naar observations.
4. Shred haalt recovery/activity summaries op.
5. Shred combineert die met training/nutrition/body state.

## Privacy

Apple Health data blijft self-hosted via Health Core. Geen externe analytics of cloud dashboards toevoegen.

