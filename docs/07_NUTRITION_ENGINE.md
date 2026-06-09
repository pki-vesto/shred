# Nutrition Engine

## Doel

De nutrition engine moet voeding snel logbaar, controleerbaar en analyseerbaar maken. Voor recompositie zijn calorieën en eiwit de primaire signalen; koolhydraten en vet ondersteunen performance, herstel en compliance.

## Producten

Productvorm in `js/nutrition.js`:

- `id`
- `name`
- `kcalPer100g`
- `pPer100g`
- `cPer100g`
- `fPer100g`
- `unitName`
- `unitGrams`
- `isFavorite`
- `useCount`
- `lastUsedAt`
- `lastGrams`
- `hidden`
- `deleted`
- `seed`
- `fromLegacy`
- timestamps

Producten mogen verborgen worden als ze nog in logs voorkomen. Hard delete mag alleen als er geen historische afhankelijkheden zijn; anders gaat macrohistorie kapot.

Productzoek (toevoeg-sheet) rankt op matchkwaliteit (exact → prefix → woordbegin → deelstring) en daarbinnen op gebruik (`useCount`, `lastUsedAt`), zodat het bedoelde product bovenaan staat i.p.v. puur alfabetisch.

## Recepten En Templates

Huidige meal templates bewaren:

- naam;
- categorie;
- lijst van productId + grams;
- deleted tombstone.

Toekomstige recepten kunnen berekend worden als samengestelde producten, maar alleen als:

- macro's reproduceerbaar zijn;
- wijzigingen historisch versioned zijn;
- oude logs niet veranderen door receptupdates.

## Macro's

Dagtotalen worden berekend door per food item de productmacro's te vermenigvuldigen met `grams / 100`.

Primaire doelen:

- kcal: default 2250.
- protein: default 180g.
- carbs: default 220g.
- fat: default 65g.

Compliance weegt calorieën en eiwit zwaarder dan carbs/fat. Voor recompositie is eiwitminimum belangrijker dan perfecte macroverdeling.

## Maaltijdstructuur

Huidige categorieën:

- ontbijt
- lunch
- snack
- diner

Deze categorieën zijn stabiele UI- en data-keys. Nieuwe categorieën vragen migratie en moeten in sync, voice en UI worden meegenomen.

## Voice Logging

Voice pipeline:

1. Browser neemt audio op.
2. `/api/meals/voice` ontvangt multipart audio.
3. Whisper transcribeert lokaal.
4. Claude Haiku matcht transcript tegen productbibliotheek.
5. Backend sanity-checkt items.
6. Client toont preview.
7. Accept schrijft client-side via nutrition helpers.

Offline:

- audio wordt in IndexedDB `queue` opgeslagen;
- queue wordt verwerkt voor gewone sync;
- voorstel verschijnt later als pending proposal.

Het voorstel toont per item een confidence-pill (alleen bij twijfel: "indicatief"/"lage zekerheid"), en voor nieuwe producten de per-100g macro's zodat Peter de schatting kan checken vóór hij hem opslaat. Een uitlegregel bovenaan beschrijft de accept/edit-flow.

## AI Lookup

`/api/products/lookup` schat macro's per 100g voor nieuwe producten. De output is een voorstel, geen automatische waarheid.

Regels:

- preview verplicht;
- confidence zichtbaar;
- notes tonen bij onzekerheid;
- kcal sanity bounds;
- macro-kcal consistentiewaarschuwing;
- Peter beslist.

## Compliance

Nutrition compliance moet minimaal meten:

- kcal binnen tolerantie;
- eiwitminimum gehaald;
- logged days per week;
- weekend afwijking;
- gemiddelde calorieën per week;
- relatie met trendgewicht.

Huidige score gebruikt calorie target en protein target. Toekomstige score moet apart rapporteren: `accuracy`, `protein`, `consistency`, `energy balance`.

## Doelen

Doelen zijn persoonlijke settings, opgeslagen als `meta.goals`.

Toekomstige doeltypes:

- cut/recomp/maintenance mode;
- eiwit per kg lichaamsgewicht;
- calorie cycling training/rest;
- minimum fiber;
- alcohol limit;
- sodium/hydration indien Health Core relevant wordt.

## Analyses

Nutrition analyses moeten antwoorden:

- Is het caloriegemiddelde consistent met gewichtsverandering?
- Is eiwitinname hoog genoeg voor spierbehoud?
- Zijn lage trainingsdagen gekoppeld aan lage carbs/calorieën?
- Zijn weekenddagen de grootste afwijking?
- Welke producten/templates maken compliance makkelijker?

Zie [14_ANALYTICS_AND_DASHBOARDS.md](14_ANALYTICS_AND_DASHBOARDS.md).

