# Recovery Engine

## Doel

De recovery engine bepaalt of Peter klaar is voor de geplande belasting. Herstel is geen los dashboard; het beïnvloedt training, deloads, blessurerisico en voedingsadvies.

## Slaap

Toekomstige bron: Apple Health via Health Core.

Te gebruiken signalen:

- totale slaapduur;
- time in bed;
- slaapconsistentie;
- slaaptekort over 3-7 dagen;
- subjectieve notities indien toegevoegd.

Slaap mag niet als exacte waarheid worden behandeld. Wearables hebben meetfouten; trends zijn belangrijker dan losse nachten.

## HRV

Toekomstige bron: Apple Health HRV SDNN.

Gebruik:

- baseline per persoon;
- afwijking van 7/28-daags gemiddelde;
- daling meerdere dagen op rij;
- combinatie met rusthartslag en performance.

Een enkele lage HRV is geen automatisch deloadsignaal.

## Rusthartslag

Toekomstige bron: Apple Health.

Gebruik:

- stijging boven baseline als stress/herstelbelasting;
- samen met lage HRV sterker signaal;
- samen met slaaptekort en performance drop verhoogt risico.

## Herstel

Readiness moet worden opgebouwd uit:

- slaap;
- HRV;
- rusthartslag;
- recente trainingsload;
- voeding;
- gewichtsdaling;
- pijn/notities;
- subjectieve vermoeidheid wanneer beschikbaar.

## Vermoeidheid

Vermoeidheid wordt niet alleen door training veroorzaakt. De engine moet onderscheid maken tussen:

- acute trainingsvermoeidheid;
- cumulatieve overload;
- calorietekort;
- slechte slaap;
- knie-/pijnrisico;
- externe stress, indien gelogd.

## Readiness

Readiness output:

- `green`: geplande sessie normaal uitvoeren.
- `amber`: volume/intensiteit matigen of techniekfocus.
- `blue`: deload/recovery sessie.
- `red`: pijn/ziekte/hoog risico, training aanpassen of overslaan.

Elke readiness moet evidence tonen: "HRV 12% onder baseline, rusthartslag +6, slaap 5:50".

## Deloadsignalen

Sterke deloadsignalen:

- 2+ sessies performance drop bij vergelijkbare RIR;
- HRV meerdere dagen laag;
- rusthartslag meerdere dagen hoog;
- slaaptekort accumuleert;
- knie-notities nemen toe;
- agressieve gewichtsverlies trend;
- motivation/fatigue notities negatief.

Deloadadvies moet concreet zijn:

- volume -30 tot -50%;
- RIR 3-4;
- geen knie-onvriendelijke swaps;
- cardio low impact;
- focus op slaap en eiwit.

