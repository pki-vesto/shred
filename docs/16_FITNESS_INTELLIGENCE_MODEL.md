# Fitness Intelligence Model

## Doel

Dit document definieert hoe Shred vooruitgang, herstel, risico, aanbevelingen en voorspellingen bepaalt. Het is de basis voor toekomstige intelligence en AI coach features.

## Vooruitgang

Vooruitgang is domeinspecifiek:

Training:

- meer gewicht bij vergelijkbare reps/RIR;
- meer reps bij hetzelfde gewicht/RIR;
- meer volume zonder herstelverlies;
- betere completion;
- stabiele knie zonder pijnnotities.

Nutrition:

- caloriegemiddelde past bij doel;
- eiwit consistent;
- logging coverage hoog;
- minder extreme afwijkingen.

Body:

- trendgewicht beweegt volgens doel;
- foto's/meting verbeteren;
- performance blijft gelijk of stijgt.

Recovery:

- HRV/RHR rond baseline;
- slaap voldoende;
- deloads werken;
- vermoeidheid daalt na aanpassing.

## Herstel

Herstel wordt bepaald uit de verhouding tussen load en capacity.

Load:

- recent volume;
- intensiteit/RIR;
- cardio;
- stappen;
- calorietekort;
- externe stress/notities.

Capacity:

- slaap;
- HRV;
- rusthartslag;
- voeding;
- trainingsleeftijd;
- blessurestatus.

Readiness = capacity - load, uitgedrukt als kwalitatieve status met evidence.

## Risico

Risicocategorieën:

- blessurerisico, vooral rechterknie;
- onderherstel;
- te agressief cutten;
- datakwaliteitsrisico;
- AI-onzekerheid;
- sync/data verlies risico.

Knie-risico stijgt door:

- knie-onvriendelijke swaps;
- hoge lower-body volume;
- pijnnotities;
- slaap/recovery laag;
- abrupte load stijging.

## Aanbevelingen

Aanbevelingen moeten:

- klein zijn;
- uitvoerbaar vandaag of deze week;
- evidence tonen;
- onzekerheid benoemen;
- reversibel zijn;
- Peter's ervaring respecteren.

Voorbeelden:

- "Houd K3 lower-body op 2 werksets per slot; HRV laag en vorige legpress volume +22%."
- "Eiwit is 4/7 dagen onder target; voeg vaste skyr-template toe bij ontbijt."
- "Geen calorie-aanpassing: gewichtstrend heeft slechts 3 meetpunten."

## Voorspellingen

Voorspellingen ontstaan uit:

- voldoende historische data;
- eenvoudige transparante modellen eerst;
- Health Core observations;
- confidence op basis van meetfrequentie en variantie.

Gebruik:

- 7-14 dagen trendweight forecast;
- plateau probability;
- deload need probability;
- goal pace.

Niet doen:

- exact lichaamsvetpercentage claimen;
- causaliteit uit correlatie claimen;
- AI black-box beslissingen gebruiken zonder deterministic basis.

## Evidence Ladder

Sterk:

- meerdere metingen over tijd;
- consistente richting over domeinen;
- objective + subjective match.

Middel:

- één domein met duidelijke trend;
- korte termijn performance change.

Zwak:

- losse notitie;
- één afwijkende dag;
- AI-interpretatie zonder data.

