# Shred Tracker

Offline-first PWA voor het 90-dagen fat-loss programma. Eén gebruiker, max twee
devices (iPhone + Mac). Sync via een eigen mini-backend op frodo. **Niet publiek
bereikbaar** — alleen via Peter's eigen Tailscale-netwerk (tailnet).

```
iPhone / Mac (Tailscale aan)
   │   https://shred.tail9d0c71.ts.net   (geldig Let's Encrypt cert)
   ▼
Tailscale Serve op frodo  ── termineert TLS, proxyt plain-http ──▶ 127.0.0.1:80
                                                                        │
                                                                    caddy:80
                                                                    ├─ /api/* → shred-api (Node + SQLite, intern :8089)
                                                                    └─ /      → shred (nginx, statisch, ook direct op :8088)

(dezelfde Caddy serveert ook http://forge.frodo.local — losse service, ongemoeid)
```

## Auth-model — lees dit

Er is **geen** applicatie-niveau auth (geen bearer token, geen login). De enige
beveiligingslaag is **Tailscale**: alleen apparaten in Peter's tailnet kunnen
frodo überhaupt bereiken (WireGuard + ACL). De API en alle data zijn dus
*onauthenticated* bereikbaar voor iedereen in het tailnet.

> **SECURITY:** wie in dit tailnet zit, kan álle data lezen en schrijven. Breid
> de Tailscale-ACL **niet** uit naar untrusted/gedeelde devices en zet frodo
> **niet** open op het LAN of publieke internet (geen Tailscale Funnel, geen
> port-forward op 80/443). Dat zou de hele app onbeveiligd blootleggen.
>
> Een bearer-token-laag terugzetten kan: herstel de middleware in
> `api/server.js`, het token-werk in `js/sync.js`, en de (uitgecommentarieerde)
> `BEARER_TOKEN` in `.env`.

## Eerste deploy

```bash
cd ~/shred
docker compose build              # api-image
docker compose up -d              # 4 containers: shred, shred-api, whisper, caddy
```

Tailscale (eenmalig, op frodo — vereist root):

```bash
curl -fsSL https://tailscale.com/install.sh | sudo sh
sudo tailscale up --hostname=shred          # open de auth-URL, login op je account
sudo tailscale serve --bg --https=443 http://127.0.0.1:80
```

In de Tailscale **admin-console** (https://login.tailscale.com/admin/dns):
**MagicDNS** aanzetten én **HTTPS Certificates** aanzetten. Dat laatste laat
Tailscale Serve automatisch een Let's Encrypt-cert trekken voor
`shred.tail9d0c71.ts.net`.

Daarmee:

- App over HTTPS op `https://shred.tail9d0c71.ts.net` (geldig cert, geen profiel nodig)
- API op `https://shred.tail9d0c71.ts.net/api/*` (geen token; Tailscale is de auth)
- LAN-fallback voor desktop-tests: `http://frodo.local:8088` (directe nginx, géén sync, géén mic)
- De `whisper`-container downloadt bij de eerste spraak-request eenmalig zijn
  model (~0.5 GB) naar het `whisper_cache`-volume.

`--hostname=shred` zet alleen het Tailscale-*label* van de node op `shred`
(daardoor de mooie URL); de OS-hostname blijft `frodo`. Na een reboot blijft de
sessie staan (zie *Tailscale auto-start*), dus `tailscale up` is niet opnieuw nodig.

## HTTPS / microfoon

De voeding-tab logt via spraak (mic). Browsers geven alleen microfoontoegang in
een **secure context** (https). Tailscale Serve levert een **geldig Let's
Encrypt-cert** op `shred.tail9d0c71.ts.net`, dus de mic werkt zonder dat je per
device een CA-profiel hoeft te vertrouwen — dat hele self-signed gedoe is weg.

## Setup nieuwe iPhone

1. Installeer de **Tailscale**-app uit de App Store.
2. Login met **hetzelfde account** als frodo. Verifieer dat `shred` in de
   devicelijst staat.
3. Safari → ga naar `https://shred.tail9d0c71.ts.net` → app laadt zonder
   cert-waarschuwing.
4. Deel → **Add to Home Screen**.
5. Open vanaf het homescreen. De sync start vanzelf — **geen token invoeren**.
   (De app start "leeg" op een nieuw device; je data stroomt binnen via sync.)
6. Mic-knop werkt direct (HTTPS is geldig).
7. Oude **certificaat-profielen** kun je verwijderen via *Instellingen ▸ Algemeen
   ▸ VPN en apparaatbeheer*. Niet meer nodig.

Herhaal stap 1–5 op de Mac (Tailscale-app + Safari/Chrome).

Buiten huis: zolang Tailscale aan staat (ook op 4G) werkt alles — thuis,
sportschool, op pad. Zonder Tailscale werkt de app offline verder (alles in
IndexedDB) en sync't bij de volgende verbinding binnen ~30 s.

## Files & directories

```
~/shred/
├── docker-compose.yml       4 services: shred, shred-api, whisper, caddy
├── Caddyfile                plain-http routing (forge-host + shred catch-all); TLS doet Tailscale
├── .env                     ANTHROPIC_API_KEY etc. (NIET committen) — geen actief BEARER_TOKEN meer
├── index.html               app shell
├── manifest.json            PWA manifest (relatieve start_url/scope — hostname-onafhankelijk)
├── service-worker.js        cache-first shell, network for /api
├── icons/                   PNGs + bron-SVG + generate.py
├── css/app.css              alle styles
├── js/                      ES modules — entry: js/app.js
│   ├── state.js + lib/idb.js   IndexedDB-backed state
│   ├── sync.js              health-ping + LWW sync engine (geen auth-header)
│   ├── sessions.js          trainingsschema — slots (categorie + default-oefening)
│   ├── exercises.js         oefeningenbibliotheek + categorieën (swap-bron)
│   ├── photos.js            blob CRUD
│   └── ui/                  per-tab render + components (swap.js = swap-sheet)
├── api/                     Node + Express + better-sqlite3
│   ├── Dockerfile           node:22-alpine, ~80MB
│   ├── server.js            CORS; geen auth-middleware (Tailscale gate)
│   └── routes/              /health /sync /photos /meals/voice
└── data/                    BIND-MOUNT — SQLite db + photo blobs
    ├── shred.db
    └── photos/<id>.<ext>
```

`~/shred/data/` is de complete backup target. Eén tarball volstaat:

```bash
docker compose stop shred-api
tar czf shred-data-$(date +%Y%m%d).tar.gz -C ~/shred data .env
docker compose start shred-api
```

## Updates uitrollen

Frontend-edits onder `~/shred/` worden direct geserveerd via de read-only nginx
mount — geen restart nodig. Bump wél `CACHE_VERSION` in `service-worker.js` om
de wijziging te forceren op reeds-geïnstalleerde PWAs (nieuwe SW activeert binnen
één page-reload).

Backend-wijzigingen:

```bash
docker compose build shred-api && docker compose up -d shred-api
```

## Oefening-swap & vorige sessie

Elke krachtsessie bestaat uit **slots**: een slot heeft een spiergroep-categorie
en een default-oefening (zie `js/sessions.js`). De volledige
oefeningenbibliotheek staat in `js/exercises.js`, gegroepeerd per categorie.

**Swappen** — tik de oefeningsnaam (chevron ▾) in de Vandaag-tab. Een
bottom-sheet toont alle varianten in dezelfde categorie, **knievriendelijke
bovenaan** (✓ groen; knie-onveilig krijgt ⚠ en staat onderaan — Peter's
rechterknie). Eén tik wisselt de oefening voor díe dag (`state.slotChoices`).
Met de toggle *"Onthoud als standaard voor dit slot"* wordt de keuze de
voorkeur voor volgende sessies (`state.slotDefaults`). Een geswapte oefening
toont een swap-markering naast de naam.

**Progressie per concrete oefening** — sets worden gelogd op de echte
`exerciseId`, niet op het slot. 80 kg barbell-bench is dus iets anders dan 80 kg
dumbbell-bench: elke variant houdt strikt zijn eigen geschiedenis. De
default-id's (`bench`, `rdl`, …) zijn ongewijzigd, dus bestaande logs blijven
1-op-1 gekoppeld — geen migratie nodig.

**Vorige sessie** — onder elke oefening staat een compacte regel
`Vorige (10 jun): 80 × 8 · 80 × 8 · 75 × 8` met een trend-pijl (↑/↓/→ t.o.v. de
twee sessies daarvoor). Tik de regel (of de ↺-knop) om alle set-inputs ineens te
vullen met de vorige waarden — inclusief het juiste aantal sets. Had je vandaag
al iets ingevuld, dan wordt eerst om bevestiging gevraagd. Bij een net geswapte
variant toont de regel de vorige sessie van **die** variant.

**Sync** — `slotChoices` synct per dag (eigen `slot_choices`-tabel, LWW op
`updatedAt`); `slotDefaults` rijdt mee als `meta`-record. Kies dus een variant
op je iPhone, en na sync staat hij ook actief op je Mac.

## Spraak (voeding loggen via je stem)

Tik de mic-knop in een maaltijd-sectie, zeg wat je at ("150 gram kip, twee
handen rijst, broccoli"), en je krijgt een voorstel met producten + porties +
macro's om te accepteren of bij te werken.

```
audio (mic, https)  →  POST /api/meals/voice
                     →  whisper-container (transcriptie, blijft op het LAN)
                     →  Claude Haiku (parse + match tegen jouw bibliotheek)
                     →  voorstel  →  preview-modal  →  accepteren = client-side loggen
```

Accepteren gebeurt **client-side** via de bestaande nutrition-helpers, zodat het
gewoon via de LWW-sync loopt en op dag-nummer (1-90) gekeyd blijft — er is dus
géén server-side accept-endpoint.

**Offline**: zonder verbinding wordt de opname in IndexedDB (`queue`-store)
bewaard met maaltijd-context. De sync-engine verwerkt de wachtrij zodra frodo
weer bereikbaar is (vóór de gewone state-sync); het voorstel verschijnt daarna
in een "Te bevestigen"-banner bovenaan de voeding-tab.

**Privacy**: audio wordt op je eigen server (frodo) getranscribeerd door de
`whisper`-container — het verlaat het LAN niet en wordt na verwerking gewist.
Alleen de getypte transcript-tekst gaat naar de Anthropic-API voor het matchen
tegen je productbibliotheek (dat is de enige call die het publieke internet op
gaat).

### Config (`~/shred/.env`)

```
ANTHROPIC_API_KEY=sk-ant-...   # voor Claude Haiku (parsing/matching) — vul in!
LLM_MODEL=claude-haiku-4-5     # alleen claude-modellen ondersteund
ENABLE_VOICE=true              # zet op false om /api/meals/voice uit te zetten
WHISPER_LANGUAGE=nl            # transcriptie-taal
```

`WHISPER_URL` (intern, `http://whisper:9000`) staat in `docker-compose.yml`. De
mic-knop is per device in/uit te zetten via *Settings ▸ Spraak*.

Backend wijzigen of `.env` aanpassen vereist een rebuild/restart:

```bash
docker compose build shred-api && docker compose up -d shred-api whisper
```

Snel testen vanaf frodo: `api/test-voice.sh opname.m4a [maaltijd]`.

## Tailscale auto-start

Zorg dat Tailscale na een reboot vanzelf start (sessie staat in
`/var/lib/tailscale`, dus geen her-auth nodig):

```bash
sudo systemctl enable --now tailscaled
```

`tailscale serve` is persistent (`--bg`) en komt na reboot vanzelf terug. Check
de status met `tailscale status` en `tailscale serve status`.

## Troubleshooting

**App niet bereikbaar / laadt niet**
- Staat **Tailscale aan** op dit device? (iPhone: Tailscale-app → connected.)
- Op frodo: `tailscale status` (zie je `shred` + je device?) en
  `tailscale serve status` (moet `https://shred.tail9d0c71.ts.net → 127.0.0.1:80` tonen).
- `curl -sS https://shred.tail9d0c71.ts.net/api/health` → `{"ok":true,...}`.

**Bolletje blijft rood / sync werkt niet**
- Bijna altijd: Tailscale staat uit op het device. Zet aan.
- Backend check: `curl https://shred.tail9d0c71.ts.net/api/health`. Mislukt?
  `docker compose logs --tail 50 shred-api shred-caddy`.

**Data lijkt leeg op een nieuw device**
- Normaal: IndexedDB is per-origin en start leeg. Met Tailscale aan sync't de
  app de server-data (SQLite op frodo) binnen ~30 s naar binnen. Niets gaat verloren.

**Photos verschijnen niet op tweede device**
- Photo-metadata sync't automatisch, maar de blob wordt pas gefetched bij eerste
  view. Open de Body-tab — even wachten op laden.

**Mic-knop doet niets / "Microfoon vereist HTTPS"**
- Open de app via `https://shred.tail9d0c71.ts.net` (niet `:8088`, niet plain http).
- Mic per device aan in *Settings ▸ Spraak*; gebruik daar "Mic test".

**Spraak geeft een fout / leeg voorstel**
- `ANTHROPIC_API_KEY` ingevuld in `.env`? Daarna `docker compose up -d shred-api`.
- Whisper bereikbaar? `docker compose logs --tail 50 shred-whisper`. De eerste
  request kan traag zijn (model-download).
- `api/test-voice.sh opname.m4a` geeft de ruwe response terug om te debuggen.

**Data lijkt corrupt na iets te ver gegaan refactoren**
- IndexedDB wipe via Settings → "Alle voortgang wissen". App leest dan
  `localStorage['shred_state_v2']` als rollback en migreert opnieuw.

## Architectuur-keuzes (kort)

- **Tailscale i.p.v. self-signed cert**: een geldig Let's Encrypt-cert via
  Tailscale Serve maakt iOS-microfoon (secure context) probleemloos, werkt
  overal (thuis/4G), en houdt frodo privé — geen profiel-installatie, geen
  publieke blootstelling.
- **Geen bearer token**: Tailscale's WireGuard + ACL is de netwerk-auth. Een
  tweede app-laag was dubbel-op (en de PWA had geen UI om 'm in te voeren), dus
  eruit. Re-enable: zie *Auth-model*.
- **Caddy blijft, plain-http**: TLS doet Tailscale; Caddy doet alleen nog
  host-routing (`/api/*` → shred-api, rest → nginx) en serveert daarnaast de
  losse `forge.frodo.local`. Daarom geen `tls internal`/`:443` meer.
- **Last-write-wins per record** op `updatedAt` ms-epoch. Records zijn klein
  genoeg dat field-level merges geen meerwaarde hebben. Bij tie wint server.
- **Geen WebSocket**: 30s interval + `online`/`visibilitychange` events volstaan
  voor twee menselijke gebruikers.
- **Photo blobs op disk** (`data/photos/<id>.<ext>`) i.p.v. in SQLite:
  goedkoper voor streaming en backup-friendlier.
```
