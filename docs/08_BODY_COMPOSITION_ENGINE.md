# Body Composition Engine

## Doel

De body composition engine vertaalt ruwe lichaamsdata naar bruikbare recompositiefeedback. Daggewicht is ruisgevoelig; trends, foto's, metingen en trainingcontext bepalen de interpretatie.

## Gewicht

Huidig:

- `weights[day] = kg`
- SQLite tabel `weights(day, kg, updated_at)`
- Health Core observation `body.weight`

Validatie:

- realistische range voor Peter: grofweg 60-100 kg;
- absolute plausibility range: 30-200 kg;
- nieuwe input mag niet per ongeluk gram/lbs worden.

## Trendgewicht

Huidige metrics (`bodyMetrics.js`):

- 7-daags en 14-daags gemiddelde.
- lineaire trend per week over recente data.
- **EWMA-trendgewicht** (`ewmaSeries`, halfLife 10 dagen, gap-aware): gladde trendlijn die onregelmatig wegen corrigeert. Dit is nu ook de trendlijn in de gewichtsgrafiek.
- **plateau v2** (`plateauV2`): vlak wanneer de EWMA-trend < 0,1 kg/week is over ≥ 14 dagen span — minder ruisgevoelig dan de oude `avg7Delta`-plateau (die blijft beschikbaar als `plateau`).
- **weeg-consistentie** (`weighInConsistency`): gelogde dagen / mogelijke dagen over de laatste 14 dagen.
- **forecast** (`trendForecast`): EWMA-trend 14 dagen vooruit doorgetrokken, zonder TDEE-aanname.

Getoond op de Lichaam-tab als trendgewicht + tempo, plateau/forecast-regel en consistentie.

Toekomstig:

- confidence-gewicht koppelen aan de consistentiescore.
- waterweight flags na hoge carbs/sodium, slechte slaap of late maaltijd.

## Foto's

Huidig:

- Foto metadata in `photos`.
- Blob lokaal in IndexedDB en server filesystem.
- Server sync via photo metadata en `/api/photos/:id`.
- Soft delete met `deleted`.

Foto's worden per week gegroepeerd. Ze zijn subjectieve maar waardevolle evidence voor recompositie wanneer gewicht stagneert en training verbetert.

## Metingen

Geïmplementeerd als eigen sync-recordtype `measurements` (niet in notes verstopt):

- taille, heup, borst, bovenarm, dij — in cm, per programmadag.
- Client: `state.measurements[day] = { waist, hip, chest, arm, thigh }`, gemuteerd via `mutate('measurements', '<day>')`.
- Server: tabel `measurements(day PRIMARY KEY, value JSON, updated_at)`, LWW zoals de andere types.
- Health Core: best-effort dual-write naar `body.waist`/`body.hip`/`body.chest`/`body.arm`/`body.thigh` (cm); alleen ingevulde velden, ruwe waarden (geen aggregatie).
- UI: invoer + taille-trend (laatste waarde, delta sinds start, cm/week) op de Lichaam-tab.

Taille is bij recompositie vaak een scherper signaal dan scale-gewicht; daarom krijgt taille de trendweergave.

Nog gepland: nek (optioneel), foto-gekoppelde metingen en meetherinneringen (#98).

## Vetverlies

Vetverlies wordt afgeleid uit:

- trendgewicht;
- caloriegemiddelde;
- trainingsperformance;
- foto's;
- metingen;
- recovery.

Regel: geen hard percentage lichaamsvet voorspellen zonder voldoende evidence. Gebruik ranges en confidence.

## Voorspellingen

Voorspellingen moeten conservatief zijn:

- projecteer trendgewicht 7-14 dagen vooruit;
- markeer onzekerheid bij weinig meetpunten;
- gebruik calorie-inname alleen als ondersteunende verklaring;
- waarschuw bij te snelle daling, vooral bij performance/recovery daling.

## Recompositieanalyse

Recompositie is waarschijnlijk wanneer:

- gewicht stabiel of licht dalend is;
- waist/foto's verbeteren;
- kracht of volume stijgt;
- eiwit compliance goed is;
- herstel niet instort.

Recompositie is twijfelachtig wanneer:

- gewicht snel daalt;
- performance daalt;
- HRV/slaap verslechtert;
- foto's/metingen geen verbetering laten zien;
- calorie-inname inconsistent is.

