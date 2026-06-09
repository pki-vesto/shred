# UI UX Guidelines

## Visuele Identiteit

Shred is strak, rustig en functioneel. De app voelt als een training cockpit, niet als een marketingwebsite.

Kern:

- cool near-black basis;
- amber als identiteit/primary/streak/strength;
- groen voor done/on-track;
- blauw voor recovery/deload;
- rood alleen voor duidelijke waarschuwing/overshoot;
- compacte kaarten;
- iPhone-first.

## Design Tokens

Tokens staan in `css/app.css`.

Belangrijk:

- `--bg`
- `--surface`, `--surface-2`, `--surface-3`
- `--line`, `--line-2`
- `--text`, `--text-2`, `--text-3`, `--text-4`
- `--amber`, `--green`, `--blue`, `--red`
- radius tokens `--r-sm`, `--r-md`, `--r-lg`, `--r-pill`
- `--pad`

Light theme bestaat via `[data-theme="light"]` en mag alleen via tokens afwijken.

## Componenten

Belangrijke componentfamilies:

- topbar met progress line en sync dot;
- bottom nav;
- day nav;
- session card;
- exercise item;
- sets log;
- macro summary;
- weight chart;
- bottom sheet;
- toast;
- modal/preview.

Nieuwe componenten moeten aansluiten op bestaande spacing, radius en kleurgebruik.

## Knoppen

Knoppen zijn direct, kort en taakgericht:

- primary: amber;
- secondary: surface;
- destructive: rood, spaarzaam;
- icon-only alleen voor bekende acties en met title/aria label.

Tap targets moeten geschikt zijn voor iPhone.

## Kaarten

Cards zijn functionele containers voor sessies, stats of herhaalde items. Geen nested cards tenzij het bestaande patroon dat afdwingt.

Richtlijn:

- compacte padding;
- border via `--line`;
- radius volgens tokens;
- geen zware schaduw behalve overlays/sheets.

## Sheets

Bottom sheets worden gebruikt voor keuze- of editflows zoals exercise swaps. Ze moeten:

- scrollbaar zijn;
- duidelijke close affordance hebben;
- geen data verliezen zonder actie;
- op mobiel niet overlappen met safe-area.

## States

Elke workflow kent:

- idle;
- editing;
- saving/local saved;
- syncing;
- synced;
- offline;
- error.

Offline is geen fout voor lokale acties. Toon syncstatus, maar blokkeer logging niet.

## Skeletons

Gebruik skeletons alleen voor network-afhankelijke views. Lokale IndexedDB views moeten snel vanuit state renderen; daar is meestal geen skeleton nodig.

## Empty States

Empty states moeten de volgende actie bieden:

- geen voeding: "Voeg product toe" of mic.
- geen gewicht: "Log gewicht".
- geen foto's: "Voeg weekfoto toe".
- geen traininghistorie: toon prescribed sets in plaats van lege analyse.

## Foutstaten

Foutmeldingen moeten zeggen:

- wat misging;
- of data lokaal veilig is;
- wat Peter kan doen.

Voorbeelden:

- Voice parse faalt: transcript tonen en handmatig loggen mogelijk maken.
- Sync offline: lokale data blijft bewaard.
- AI lookup faalt: handmatige productinvoer tonen.

