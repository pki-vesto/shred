# Analytics And Dashboards

## Doel

Dashboards moeten fitnessbeslissingen ondersteunen. Ze zijn geen verzameling grafieken, maar een samenvatting van status, trend, risico en eerstvolgende actie.

## Huidige Dashboards

Huidig:

- topbar program progress;
- today session summary;
- food macro summary;
- body weight trend (EWMA-trendgewicht, plateau v2, consistentie, forecast);
- overview KPI's;
- deterministic weekreview;
- Overzicht "Trainingsintelligentie": weekvolume + per spiergroep + WoW-delta, **volume-trend per week** (sparkline), **PR-tijdlijn** (gewicht/reps/volume/e1RM) en **kniebelasting** per laatste sessie + historie-stippen (knie-risk);
- Overzicht "Voortgang & tempo": **goal-pace** (sessies voltooid vs verwacht + dag-90 gewichtsprojectie) en **macro-trend** (gem. kcal per week met doellijn).

## KPI's

Primaire KPI's:

- week completion percentage;
- training sessions completed;
- session volume;
- PR count;
- nutrition logged days;
- macro compliance;
- average calories;
- protein compliance;
- 7-day trendweight;
- weight trend per week;
- readiness score toekomstig.

## Weekreviews

Weekreview moet bestaan uit:

- training consistency;
- nutrition compliance;
- weight/body trend;
- recovery status;
- risk flags;
- one-week recommendation.

Huidige weekreview is deterministic in `js/dashboardMetrics.js`. AI-weekreview mag daar later tekst en context aan toevoegen, maar deterministic facts blijven leidend.

## Heatmaps

Nuttige heatmaps:

- 90-dagen completion grid;
- nutrition compliance per dag;
- weight log availability;
- sleep/recovery readiness;
- training volume per spiergroep;
- knee-risk exercise exposure.

## Trends

Trends moeten smoothing gebruiken waar dagelijkse ruis hoog is:

- gewicht: 7/14 dagen of EWMA;
- calories: weekgemiddelde;
- HRV/RHR: baseline deviation;
- volume: weekniveau per categorie.

## Rapportages

Rapporttypes:

- daily briefing;
- weekly review;
- phase review per 30 dagen;
- deload review;
- end-of-90-days report.

Rapportages moeten verwijzen naar evidence: dagen, metrics, notities, foto's of Health Core observations.

## Analyseprincipes

- Toon absolute waarde plus trend.
- Toon confidence bij weinig data.
- Maak onderscheid tussen ontbrekende data en negatieve status.
- Vermijd causale claims uit correlaties.
- Maak aanbevelingen klein en uitvoerbaar.

