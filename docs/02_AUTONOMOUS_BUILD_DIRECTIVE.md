# Autonomous Build Directive

Dit document heeft hoogste prioriteit voor alle toekomstige AI-agents. Als een ander document hiermee conflicteert, geldt dit document tenzij Peter expliciet anders instrueert.

## Missie

Ontwikkel Shred Tracker conservatief, dataveilig en productgericht door. Bouw alleen functionaliteit die past bij een single-user, self-hosted, offline-first fitness intelligence platform voor Peter.

## Definitie Van Gereed

Een wijziging is pas gereed wanneer:

- het doel van de wijziging functioneel werkt op de relevante workflow;
- bestaande data niet verloren gaat;
- IndexedDB- en SQLite-recordvormen compatibel blijven of expliciet gemigreerd zijn;
- sync op iPhone en Mac conceptueel klopt;
- service worker cacheversie is verhoogd bij shell/client asset wijzigingen;
- Health Core dual-write niet kan blokkeren wanneer Health Core faalt;
- fouten zichtbaar en herstelbaar zijn voor Peter;
- de relevante docs zijn bijgewerkt wanneer gedrag, schema, architectuur of roadmap wijzigt;
- tests of handmatige verificatie zijn uitgevoerd en benoemd.

## Verboden Gedrag

Agents mogen niet:

- Shred ombouwen naar React/Vue/Svelte/Next of een andere frontend frameworkstack.
- Een nieuwe database, ORM of cloud service introduceren zonder expliciete opdracht.
- Multi-user, login, billing, teams, admin of social features toevoegen.
- Tailscale-security aannemen als publieke internetsecurity.
- `shred.db` of `core.db` destructief migreren zonder rollbackpad.
- Lokale data in IndexedDB wissen als "fix".
- Existing exercise IDs wijzigen voor oefeningen die al historie hebben.
- Producten hard deleten als bestaande logs ze nodig hebben.
- Service worker wijzigingen shippen zonder cacheversie-bump.
- Voice audio naar externe API's sturen; alleen transcripttekst mag naar Claude.
- Health Core failures laten doorwerken naar Shred-sync.
- Fictieve release notes invullen.

## Productdoelen

Shred moet:

- dagelijkse logging sneller maken;
- progressieve overload en herstelcontext beter zichtbaar maken;
- voeding eenvoudiger en betrouwbaarder maken;
- recompositie over weken analyseren;
- kniebelasting expliciet bewaken;
- Health Core-data benutten zonder de app afhankelijk te maken van netwerktoegang;
- AI gebruiken als interpretatielaag, niet als oncontroleerbare autoriteit.

## Kwaliteitsregels

- Behoud vanilla HTML/CSS/JS.
- Houd modules klein en domeingericht.
- Gebruik bestaande helpers (`state`, `mutate`, nutrition helpers, sync helpers) in plaats van parallelle state.
- Sync-records zijn Last-Write-Wins per type/key/updatedAt.
- Server wint ties om client clock skew te neutraliseren.
- Migrations zijn additive-first en rollbackbaar.
- Elke nieuwe sync-type moet client read/write, server table/upsert/select, docs en Health Core-impact beschrijven.
- Elk AI-resultaat moet previewbaar, corrigeerbaar of afwijsbaar zijn.

## UX Standaarden

- Eerste scherm moet direct bruikbaar zijn.
- Gym-workflows moeten met weinig taps werken.
- iPhone PWA is de primaire interaction target.
- Geen zware marketingcopy in de app.
- Empty states moeten actiegericht zijn.
- Error states moeten herstelpad geven.
- Visual language volgt [13_UI_UX_GUIDELINES.md](13_UI_UX_GUIDELINES.md): near-black surfaces, amber identity accent, restrained semantic colors.

## Doorontwikkelregels

1. Lees eerst [03_PROJECT_HANDBOOK.md](03_PROJECT_HANDBOOK.md), dit document en het relevante engine-document.
2. Inspecteer bestaande code voordat je ontwerpt.
3. Maak de kleinste coherente wijziging.
4. Update docs wanneer je gedrag verandert.
5. Verifieer lokaal waar mogelijk.
6. Noteer beperkingen eerlijk.

## Architecturale Grenzen

- Frontend: `index.html`, `css/app.css`, `js/**/*.js`, IndexedDB, service worker.
- Backend: Node 22, Express 5, better-sqlite3, SQLite WAL.
- Hosting: Docker op Ubuntu 24.04, Tailscale, Caddy/nginx.
- AI: Claude Haiku voor structured parsing/analysis; Whisper self-hosted voor STT.
- Health Core: centrale observations datastore, additive-only.

## AI-Regels

AI-output is nooit automatisch waarheid. Voor voeding, training, recovery en prognoses geldt:

- toon aannames;
- geef confidence of onzekerheid;
- behoud ruwe input waar nuttig;
- laat Peter corrigeren;
- schrijf alleen door na bevestiging bij subjectieve interpretatie of nieuwe voedingsproducten;
- log provenance wanneer gegevens naar Health Core gaan.

