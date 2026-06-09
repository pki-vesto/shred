# AI Coach

## Principe

De AI coach is een interpretatielaag boven betrouwbare data. AI mag helpen analyseren en samenvatten, maar niet ongemerkt data wijzigen of medische claims maken.

## Huidige Situatie

Geïmplementeerd:

- Voice meal logging via Whisper + Claude Haiku.
- Product macro lookup via Claude Haiku.
- Structured tool output en sanity-checks.
- Client-side preview/accept bij voeding.

Niet geïmplementeerd:

- echte AI weekreview;
- traininganalyse;
- recoveryanalyse;
- prognoses via LLM;
- automatische coachingplannen.

## Geplande Situatie

AI moet de bestaande deterministic metrics aanvullen:

- samenvatten wat veranderd is;
- tegenstrijdigheden noemen;
- vragen stellen bij ontbrekende data;
- kleine acties voorstellen;
- onzekerheid tonen.

## Weekreviews

Input:

- trainingscompletion;
- volume en PR's;
- nutrition compliance;
- trendgewicht;
- foto's/metingen indien beschikbaar;
- recovery observations;
- notities.

Output:

- korte samenvatting;
- drie belangrijkste signalen;
- risico's;
- aanbevolen focus voor volgende week;
- confidence en ontbrekende data.

## Voedingsanalyse

AI mag analyseren:

- welke maaltijden compliance breken;
- of eiwit consistent genoeg is;
- welke producten vaak bijdragen aan overshoot;
- simpele substitutions;
- weekendpatronen.

AI mag niet:

- automatisch doelen verlagen/verhogen zonder bevestiging;
- eten als goed/slecht moraliseren;
- exacte vetverliesclaims maken zonder trenddata.

## Trainingsanalyse

AI mag analyseren:

- progressie per oefening;
- volume per spiergroep;
- RIR en performance;
- oefening-swaps;
- kniebelasting;
- gemiste sessies.

Aanbevelingen moeten passen bij ervaring: geen beginnerstips tenzij relevant.

## Herstelanalyse

AI mag combineren:

- HRV;
- rusthartslag;
- slaap;
- trainingload;
- calorie deficit;
- notities.

Output moet concreet zijn: "maak K3 vandaag 2 sets minder per lower-body slot" in plaats van "luister naar je lichaam".

## Prognoses

AI mag prognoses uitleggen, maar de berekening hoort deterministisch/reproduceerbaar te blijven. LLM genereert tekst rondom:

- gewichtstrend;
- expected weekly change;
- kans op plateau;
- deload timing;
- macro adherence scenario's.

Zie [16_FITNESS_INTELLIGENCE_MODEL.md](16_FITNESS_INTELLIGENCE_MODEL.md).

